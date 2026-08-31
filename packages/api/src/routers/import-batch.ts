import { ORPCError } from "@orpc/server";
import z from "zod";

import {
  CORETAX_EDITABLE_FIELDS,
  CORETAX_DETAIL_FIELDS,
  CORETAX_RULESETS,
  explainCoretaxIssue,
  generateCoretaxXml,
  parseCoretaxWorkbook,
  type CoretaxDocumentType,
  validateCoretaxRow,
} from "../lib/coretax";
import { appendReconciliationAudit } from "../lib/finance-audit";
import { financeDatabase, stringField } from "../lib/finance-database";
import { requireFinancePermission } from "../lib/finance-permissions";
import {
  generatedXmlPath,
  deletePrivateBlob,
  importObjectPrefix,
  inspectPrivateBlob,
  originalObjectPath,
  readPrivateBlob,
  sha256,
  storePrivateXml,
  XLSX_CONTENT_TYPE,
  XML_CONTENT_TYPE,
} from "../lib/import-storage";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { MAX_AI_WORKBOOK_BYTES, MAX_WORKBOOK_ROWS, MAX_WORKBOOK_SHEETS } from "../lib/workbook-limits";
import { organizationProcedure } from "../index";

const documentType = z.enum(["FAKTUR_KELUARAN", "BPPU"]);

const createInput = z.object({
  reconciliationId: z.string().trim().min(1).max(191),
  fileName: z.string().trim().min(1).max(255).refine((name) => name.toLowerCase().endsWith(".xlsx"), "Upload an .xlsx workbook."),
  contentType: z.string().trim().min(1).max(150),
  sizeBytes: z.number().int().positive().max(MAX_AI_WORKBOOK_BYTES),
  documentType,
});

const idInput = z.object({ id: z.string().trim().min(1).max(191) });

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function assertZipWorkbook(bytes: ArrayBuffer) {
  const signature = new Uint8Array(bytes.slice(0, 4));
  if (signature[0] !== 0x50 || signature[1] !== 0x4b || signature[2] !== 0x03 || signature[3] !== 0x04) {
    throw new ORPCError("BAD_REQUEST", { message: "The uploaded file is not a valid XLSX workbook." });
  }
}

function isEditableField(documentType: CoretaxDocumentType, fieldKey: string) {
  if (CORETAX_EDITABLE_FIELDS[documentType].includes(fieldKey)) return true;
  const detail = /^GoodsServices\.(\d+)\.([A-Za-z]+)$/.exec(fieldKey);
  return documentType === "FAKTUR_KELUARAN" && Boolean(detail && CORETAX_DETAIL_FIELDS.includes(detail[2] as never));
}

function replaceField(row: Record<string, unknown>, fieldKey: string, value: string) {
  const detail = /^GoodsServices\.(\d+)\.([A-Za-z]+)$/.exec(fieldKey);
  if (!detail) return { normalized: { ...row, [fieldKey]: value }, previousValue: row[fieldKey] };
  const itemIndex = Number(detail[1]);
  const itemField = detail[2]!;
  const goods = Array.isArray(row.GoodsServices)
    ? row.GoodsServices.map((item) => ({ ...objectValue(item) }))
    : [];
  const item = goods[itemIndex];
  if (!item) throw new ORPCError("NOT_FOUND", { message: "Faktur detail line not found." });
  const previousValue = item[itemField];
  item[itemField] = value;
  return { normalized: { ...row, GoodsServices: goods }, previousValue };
}

async function loadBatch(database: ReturnType<typeof financeDatabase>, organizationId: string, id: string) {
  const batch = await database.importBatch.findFirst({
    where: { id, organizationId },
    include: {
      artifacts: { orderBy: { createdAt: "desc" } },
      validationRuns: { orderBy: { createdAt: "desc" }, take: 1 },
      reconciliation: { select: { id: true, name: true, status: true, periodStart: true, periodEnd: true } },
    },
  });
  if (!batch) throw new ORPCError("NOT_FOUND", { message: "Import workbook not found." });
  return batch;
}

export const importBatchRouter = {
  createMetadata: organizationProcedure.input(createInput).handler(async ({ context, input }) => {
    requireFinancePermission(context.organization.role, "import:create");
    const database = financeDatabase(context.database);
    const organizationId = context.organization.id;

    const batch = await database.$transaction(async (transaction) => {
      const writable = await transaction.reconciliation.updateMany({
        where: { id: input.reconciliationId, organizationId, status: { not: "APPROVED" } },
        data: { updatedAt: new Date() },
      });
      if (writable.count !== 1) {
        const reconciliation = await transaction.reconciliation.findFirst({
          where: { id: input.reconciliationId, organizationId },
          select: { id: true },
        });
        if (!reconciliation) throw new ORPCError("NOT_FOUND", { message: "Reconciliation not found." });
        throw new ORPCError("CONFLICT", { message: "An approved reconciliation must be reopened before importing." });
      }

      const reconciliation = await transaction.reconciliation.findFirstOrThrow({
        where: { id: input.reconciliationId, organizationId },
        select: { legalEntityId: true, ledgerAccountId: true },
      });
      const created = await transaction.importBatch.create({
        data: {
          organizationId,
          reconciliationId: input.reconciliationId,
          legalEntityId: reconciliation.legalEntityId,
          ledgerAccountId: reconciliation.ledgerAccountId,
          originalFilename: input.fileName,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          source: "MANUAL",
          documentType: input.documentType,
          rulesetVersion: CORETAX_RULESETS[input.documentType],
          status: "PENDING",
          createdById: context.session.user.id,
        },
      });
      const uploadPath = originalObjectPath(organizationId, stringField(created, "id") ?? "", input.fileName);
      const authorized = await transaction.importBatch.update({
        where: { id: stringField(created, "id") ?? "" },
        data: { sourceMetadata: { authorizedObjectPath: uploadPath } },
      });
      await appendReconciliationAudit(transaction, {
        organizationId,
        reconciliationId: input.reconciliationId,
        actorId: context.session.user.id,
        eventType: "IMPORT_METADATA_CREATED",
        metadata: { importBatchId: stringField(created, "id") ?? "", documentType: input.documentType },
      });
      return { batch: authorized, uploadPath };
    });

    return { batch: serializeFinanceValue(batch.batch), uploadPath: batch.uploadPath };
  }),

  get: organizationProcedure.input(idInput).handler(async ({ context, input }) => {
    const database = financeDatabase(context.database);
    return serializeFinanceValue(await loadBatch(database, context.organization.id, input.id));
  }),

  completeUpload: organizationProcedure
    .input(idInput.extend({ objectPath: z.string().trim().min(1).max(1000) }))
    .handler(async ({ context, input }) => {
      requireFinancePermission(context.organization.role, "import:create");
      const database = financeDatabase(context.database);
      const organizationId = context.organization.id;
      const batch = await loadBatch(database, organizationId, input.id);
      if (!batch.documentType) throw new ORPCError("BAD_REQUEST", { message: "Select a Coretax document type." });
      const expectedPrefix = `${importObjectPrefix(organizationId, batch.id)}/original/`;
      const authorizedObjectPath = String(objectValue(batch.sourceMetadata).authorizedObjectPath ?? "");
      if (!input.objectPath.startsWith(expectedPrefix) || input.objectPath !== authorizedObjectPath) {
        throw new ORPCError("BAD_REQUEST", { message: "The uploaded object does not belong to this import." });
      }
      if (batch.status === "COMPLETED" && batch.rowCount > 0) return serializeFinanceValue(batch);
      if (batch.status !== "PENDING") {
        throw new ORPCError("CONFLICT", { message: "This upload has already been finalized. Start a new import." });
      }

      const metadata = await inspectPrivateBlob(input.objectPath).catch(() => null);
      if (!metadata) throw new ORPCError("NOT_FOUND", { message: "Uploaded workbook not found." });
      if (metadata.size !== Number(batch.sizeBytes)) {
        throw new ORPCError("BAD_REQUEST", { message: "Uploaded workbook size does not match the authorized upload." });
      }
      if (metadata.size > MAX_AI_WORKBOOK_BYTES) {
        throw new ORPCError("PAYLOAD_TOO_LARGE", { message: "Workbook exceeds the 50 MB limit." });
      }

      const stored = await readPrivateBlob(input.objectPath);
      assertZipWorkbook(stored.bytes);
      const contentHash = sha256(stored.bytes);
      await database.$transaction(async (transaction) => {
          const writable = await transaction.reconciliation.updateMany({
            where: { id: batch.reconciliationId, organizationId, status: { not: "APPROVED" } },
            data: { updatedAt: new Date() },
          });
          if (writable.count !== 1) {
            throw new ORPCError("CONFLICT", { message: "Reopen the approved reconciliation before finalizing an import." });
          }
          const claimed = await transaction.importBatch.updateMany({
            where: { id: batch.id, organizationId, status: "PENDING" },
            data: { status: "PROCESSING", contentHash, startedAt: new Date() },
          });
          if (claimed.count !== 1) {
            throw new ORPCError("CONFLICT", { message: "This upload is already being processed." });
          }
          await transaction.importArtifact.create({
            data: {
              organizationId,
              importBatchId: batch.id,
              createdById: context.session.user.id,
              kind: "ORIGINAL_FILE",
              version: 1,
              inputDataVersion: 0,
              fileName: batch.originalFilename ?? "workbook.xlsx",
              contentType: XLSX_CONTENT_TYPE,
              sizeBytes: metadata.size,
              sha256: contentHash,
              objectPath: input.objectPath,
              etag: metadata.etag,
            },
          });
          await appendReconciliationAudit(transaction, {
            organizationId,
            reconciliationId: batch.reconciliationId,
            actorId: context.session.user.id,
            eventType: "IMPORT_ATTACHED",
            metadata: { importBatchId: batch.id, sha256: contentHash },
          });
        });

      let parsed: Awaited<ReturnType<typeof parseCoretaxWorkbook>>;
      try {
        parsed = await parseCoretaxWorkbook(stored.bytes, batch.documentType as CoretaxDocumentType);
        if (!/^\d{16}$/.test(parsed.tin)) {
          throw new Error("The workbook header must contain the 16-digit seller or withholding-agent TIN.");
        }
        if (parsed.sheetNames.length > MAX_WORKBOOK_SHEETS) throw new Error("Workbook contains too many worksheets.");
        if (parsed.rows.length === 0) throw new Error("No importable rows were found in the workbook.");
        if (parsed.rows.length > MAX_WORKBOOK_ROWS) throw new Error(`Workbook exceeds the ${MAX_WORKBOOK_ROWS.toLocaleString()} row limit.`);

      } catch (error) {
        await database.importBatch.updateMany({
          where: { id: batch.id, organizationId, status: "PROCESSING" },
          data: { status: "FAILED", completedAt: new Date() },
        });
        throw new ORPCError("BAD_REQUEST", {
          message: error instanceof Error ? error.message : "Workbook could not be parsed.",
        });
      }

      try {
        await database.$transaction(async (transaction) => {
          const writable = await transaction.reconciliation.updateMany({
            where: { id: batch.reconciliationId, organizationId, status: { not: "APPROVED" } },
            data: { updatedAt: new Date() },
          });
          if (writable.count !== 1) {
            throw new ORPCError("CONFLICT", { message: "Reopen the approved reconciliation before completing an import." });
          }
          await transaction.importRow.createMany({
            data: parsed.rows.map((row, index) => ({
              organizationId,
              importBatchId: batch.id,
              sourceLocator: row.sourceLocator,
              sourceSheet: row.sourceSheet,
              sourceRowNumber: row.sourceRowNumber,
              sortOrder: index,
              rawData: row.rawData as never,
              normalizedData: row.normalizedData as never,
            })),
          });
          const completed = await transaction.importBatch.updateMany({
            where: { id: batch.id, organizationId, status: "PROCESSING" },
            data: {
              status: "COMPLETED",
              rowCount: parsed.rows.length,
              importedCount: parsed.rows.length,
              rejectedCount: 0,
              configuredSheet: parsed.configuredSheet,
              sourceMetadata: {
                authorizedObjectPath,
                tin: parsed.tin,
                sheetNames: parsed.sheetNames,
                referenceRates: parsed.referenceRates ?? {},
              },
              dataVersion: 1,
              completedAt: new Date(),
            },
          });
          if (completed.count !== 1) throw new ORPCError("CONFLICT", { message: "Import processing state changed." });
          await transaction.activityLog.create({
            data: {
              organizationId,
              actorId: context.session.user.id,
              action: "IMPORT_ROWS_NORMALIZED",
              resourceType: "ImportBatch",
              resourceId: batch.id,
              metadata: { rowCount: parsed.rows.length, documentType: batch.documentType },
            },
          });
        });
      } catch (error) {
        await database.importBatch.updateMany({
          where: { id: batch.id, organizationId, status: "PROCESSING" },
          data: { status: "FAILED", completedAt: new Date() },
        });
        if (error instanceof ORPCError) throw error;
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Workbook processing failed. Start a new import and try again." });
      }

      return serializeFinanceValue(await loadBatch(database, organizationId, batch.id));
    }),

  listRows: organizationProcedure
    .input(idInput.extend({ page: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(200).default(50) }))
    .handler(async ({ context, input }) => {
      const database = financeDatabase(context.database);
      const batch = await database.importBatch.findFirst({
        where: { id: input.id, organizationId: context.organization.id },
        select: { id: true, documentType: true, dataVersion: true, rowCount: true },
      });
      if (!batch) throw new ORPCError("NOT_FOUND", { message: "Import workbook not found." });
      const latestValidation = await database.importValidationRun.findFirst({
        where: { organizationId: context.organization.id, importBatchId: batch.id },
        orderBy: { createdAt: "desc" },
      });
      const rows = await database.importRow.findMany({
        where: { organizationId: context.organization.id, importBatchId: batch.id },
        orderBy: { sortOrder: "asc" },
        skip: input.page * input.limit,
        take: input.limit,
        include: latestValidation
          ? { validationIssues: { where: { validationRunId: latestValidation.id }, orderBy: { createdAt: "asc" } } }
          : undefined,
      });
      return serializeFinanceValue({
        batch,
        fields: batch.documentType ? CORETAX_EDITABLE_FIELDS[batch.documentType] : [],
        detailFields: batch.documentType === "FAKTUR_KELUARAN" ? CORETAX_DETAIL_FIELDS : [],
        rows,
        latestValidation,
      });
    }),

  patchCell: organizationProcedure
    .input(
      z.object({
        importBatchId: z.string().trim().min(1).max(191),
        rowId: z.string().trim().min(1).max(191),
        fieldKey: z.string().trim().min(1).max(100),
        value: z.string().max(10_000),
        expectedRowVersion: z.number().int().min(0),
        expectedDataVersion: z.number().int().min(0),
      }),
    )
    .handler(async ({ context, input }) => {
      requireFinancePermission(context.organization.role, "import:create");
      const database = financeDatabase(context.database);
      const organizationId = context.organization.id;
      const result = await database.$transaction(async (transaction) => {
        const batch = await transaction.importBatch.findFirst({
          where: { id: input.importBatchId, organizationId },
          include: { reconciliation: { select: { status: true } } },
        });
        if (!batch) throw new ORPCError("NOT_FOUND", { message: "Import workbook not found." });
        if (batch.reconciliation.status === "APPROVED") throw new ORPCError("CONFLICT", { message: "Reopen the approved reconciliation before editing." });
        if (!batch.documentType || !isEditableField(batch.documentType as CoretaxDocumentType, input.fieldKey)) {
          throw new ORPCError("BAD_REQUEST", { message: "This field is not editable." });
        }
        if (batch.dataVersion !== input.expectedDataVersion) throw new ORPCError("CONFLICT", { message: "The worksheet changed. Refresh before editing again." });
        const writable = await transaction.reconciliation.updateMany({
          where: { id: batch.reconciliationId, organizationId, status: { not: "APPROVED" } },
          data: { updatedAt: new Date() },
        });
        if (writable.count !== 1) throw new ORPCError("CONFLICT", { message: "Reopen the approved reconciliation before editing." });
        const row = await transaction.importRow.findFirst({
          where: { id: input.rowId, importBatchId: batch.id, organizationId },
        });
        if (!row) throw new ORPCError("NOT_FOUND", { message: "Worksheet row not found." });
        if (row.version !== input.expectedRowVersion) throw new ORPCError("CONFLICT", { message: "This row changed. Refresh before editing again." });

        const replacement = replaceField(objectValue(row.normalizedData), input.fieldKey, input.value);
        const nextRowVersion = row.version + 1;
        const nextDataVersion = batch.dataVersion + 1;
        const batchUpdated = await transaction.importBatch.updateMany({
          where: { id: batch.id, organizationId, dataVersion: input.expectedDataVersion },
          data: { dataVersion: nextDataVersion },
        });
        if (batchUpdated.count !== 1) throw new ORPCError("CONFLICT", { message: "The worksheet changed. Refresh before editing again." });
        const rowUpdated = await transaction.importRow.updateMany({
          where: { id: row.id, organizationId, importBatchId: batch.id, version: input.expectedRowVersion },
          data: { normalizedData: replacement.normalized as never, version: nextRowVersion },
        });
        if (rowUpdated.count !== 1) throw new ORPCError("CONFLICT", { message: "This row changed. Refresh before editing again." });
        const updated = await transaction.importRow.findFirstOrThrow({ where: { id: row.id, organizationId } });
        await transaction.importCellEdit.create({
          data: {
            organizationId,
            importBatchId: batch.id,
            importRowId: row.id,
            editedById: context.session.user.id,
            fieldKey: input.fieldKey,
            previousValue: { value: replacement.previousValue ?? null },
            newValue: { value: input.value },
            previousRowVersion: row.version,
            rowVersion: nextRowVersion,
            batchDataVersion: nextDataVersion,
          },
        });
        await transaction.activityLog.create({
          data: {
            organizationId,
            actorId: context.session.user.id,
            action: "IMPORT_CELL_EDITED",
            resourceType: "ImportBatch",
            resourceId: batch.id,
            metadata: { rowId: row.id, fieldKey: input.fieldKey, dataVersion: nextDataVersion },
          },
        });
        return { row: updated, dataVersion: nextDataVersion };
      });
      return serializeFinanceValue(result);
    }),

  validate: organizationProcedure
    .input(idInput.extend({ expectedDataVersion: z.number().int().min(0) }))
    .handler(async ({ context, input }) => {
      requireFinancePermission(context.organization.role, "import:create");
      const database = financeDatabase(context.database);
      const organizationId = context.organization.id;
      const batch = await database.importBatch.findFirst({
        where: { id: input.id, organizationId },
        include: { rows: { orderBy: { sortOrder: "asc" } } },
      });
      if (!batch) throw new ORPCError("NOT_FOUND", { message: "Import workbook not found." });
      if (!batch.documentType) throw new ORPCError("BAD_REQUEST", { message: "Coretax document type is missing." });
      if (batch.dataVersion !== input.expectedDataVersion) throw new ORPCError("CONFLICT", { message: "The worksheet changed. Refresh and validate again." });
      const batchDocumentType = batch.documentType;
      const referenceRates = objectValue(objectValue(batch.sourceMetadata).referenceRates);

      const issues = batch.rows.flatMap((row) =>
        validateCoretaxRow(batchDocumentType as CoretaxDocumentType, objectValue(row.normalizedData), {
          bppuReferenceRates: referenceRates as Record<string, string>,
        }).map((issue) => ({
          ...issue,
          importRowId: row.id,
        })),
      );
      const tin = String(objectValue(batch.sourceMetadata).tin ?? "");
      if (!/^\d{16}$/.test(tin)) {
        issues.push({ severity: "ERROR", code: "INVALID_TIN", fieldKey: "TIN", message: "Workbook TIN must contain 16 digits.", invalidValue: tin, importRowId: null as never });
      }
      const counts = {
        errorCount: issues.filter((issue) => issue.severity === "ERROR").length,
        warningCount: issues.filter((issue) => issue.severity === "WARNING").length,
        infoCount: issues.filter((issue) => issue.severity === "INFO").length,
      };

      const run = await database.$transaction(async (transaction) => {
        const created = await transaction.importValidationRun.create({
          data: {
            organizationId,
            importBatchId: batch.id,
            requestedById: context.session.user.id,
            inputDataVersion: batch.dataVersion,
            ruleset: batchDocumentType,
            rulesetVersion: batch.rulesetVersion ?? CORETAX_RULESETS[batchDocumentType],
            status: "COMPLETED",
            ...counts,
            completedAt: new Date(),
          },
        });
        if (issues.length > 0) {
          await transaction.importValidationIssue.createMany({
            data: issues.map((issue) => ({
              organizationId,
              importBatchId: batch.id,
              validationRunId: created.id,
              importRowId: issue.importRowId || null,
              severity: issue.severity,
              code: issue.code,
              fieldKey: issue.fieldKey,
              parameters: { message: issue.message },
              invalidValue: { value: issue.invalidValue ?? null },
            })),
          });
        }
        await transaction.activityLog.create({
          data: {
            organizationId,
            actorId: context.session.user.id,
            action: "IMPORT_VALIDATED",
            resourceType: "ImportBatch",
            resourceId: batch.id,
            metadata: { dataVersion: batch.dataVersion, ...counts },
          },
        });
        return created;
      });
      return serializeFinanceValue(run);
    }),

  generateXml: organizationProcedure
    .input(idInput.extend({ validationRunId: z.string().trim().min(1).max(191), expectedDataVersion: z.number().int().min(0) }))
    .handler(async ({ context, input }) => {
      requireFinancePermission(context.organization.role, "import:create");
      const database = financeDatabase(context.database);
      const organizationId = context.organization.id;
      const batch = await database.importBatch.findFirst({
        where: { id: input.id, organizationId },
        include: { rows: { orderBy: { sortOrder: "asc" } }, reconciliation: { select: { status: true } } },
      });
      if (!batch) throw new ORPCError("NOT_FOUND", { message: "Import workbook not found." });
      if (batch.reconciliation.status === "APPROVED") throw new ORPCError("CONFLICT", { message: "Reopen the approved reconciliation before generating XML." });
      if (!batch.documentType) throw new ORPCError("BAD_REQUEST", { message: "Coretax document type is missing." });
      const validation = await database.importValidationRun.findFirst({
        where: { id: input.validationRunId, organizationId, importBatchId: batch.id },
      });
      if (!validation) throw new ORPCError("NOT_FOUND", { message: "Validation run not found." });
      if (validation.status !== "COMPLETED" || validation.errorCount > 0) throw new ORPCError("BAD_REQUEST", { message: "Resolve all validation errors before generating XML." });
      if (batch.dataVersion !== input.expectedDataVersion || validation.inputDataVersion !== batch.dataVersion) {
        throw new ORPCError("CONFLICT", { message: "Validation is stale. Validate the current worksheet again." });
      }
      const existing = await database.importArtifact.findFirst({
        where: {
          organizationId,
          importBatchId: batch.id,
          kind: "CORETAX_XML",
          inputDataVersion: batch.dataVersion,
        },
      });
      if (existing) return serializeFinanceValue(existing);

      const tin = String(objectValue(batch.sourceMetadata).tin ?? "");
      const xml = generateCoretaxXml(batch.documentType as CoretaxDocumentType, tin, batch.rows.map((row) => objectValue(row.normalizedData)));
      const objectPath = generatedXmlPath(organizationId, batch.id, batch.documentType);
      const stored = await storePrivateXml(objectPath, xml);
      const priorCount = await database.importArtifact.count({
        where: { organizationId, importBatchId: batch.id, kind: "CORETAX_XML" },
      });
      const fileName = `${batch.documentType.toLowerCase()}-${batch.dataVersion}.xml`;
      try {
        const artifact = await database.$transaction(async (transaction) => {
          const writable = await transaction.reconciliation.updateMany({
            where: { id: batch.reconciliationId, organizationId, status: { not: "APPROVED" } },
            data: { updatedAt: new Date() },
          });
          if (writable.count !== 1) throw new ORPCError("CONFLICT", { message: "Reopen the approved reconciliation before generating XML." });
          const current = await transaction.importBatch.updateMany({
            where: { id: batch.id, organizationId, dataVersion: batch.dataVersion },
            data: { updatedAt: new Date() },
          });
          if (current.count !== 1) throw new ORPCError("CONFLICT", { message: "Worksheet changed during XML generation." });
          const created = await transaction.importArtifact.create({
            data: {
              organizationId,
              importBatchId: batch.id,
              validationRunId: validation.id,
              createdById: context.session.user.id,
              kind: "CORETAX_XML",
              version: priorCount + 1,
              inputDataVersion: batch.dataVersion,
              fileName,
              contentType: XML_CONTENT_TYPE,
              sizeBytes: Buffer.byteLength(xml),
              sha256: sha256(xml),
              objectPath,
              etag: stored.etag,
            },
          });
          await transaction.activityLog.create({
            data: {
              organizationId,
              actorId: context.session.user.id,
              action: "CORETAX_XML_GENERATED",
              resourceType: "ImportBatch",
              resourceId: batch.id,
              metadata: { artifactId: created.id, dataVersion: batch.dataVersion, rulesetVersion: validation.rulesetVersion },
            },
          });
          return created;
        });
        return serializeFinanceValue(artifact);
      } catch (error) {
        await deletePrivateBlob(objectPath).catch(() => undefined);
        const concurrent = await database.importArtifact.findFirst({
          where: { organizationId, importBatchId: batch.id, kind: "CORETAX_XML", inputDataVersion: batch.dataVersion },
        });
        if (concurrent) return serializeFinanceValue(concurrent);
        throw error;
      }
    }),

  explainIssue: organizationProcedure
    .input(z.object({ importBatchId: z.string().trim().min(1).max(191), issueId: z.string().trim().min(1).max(191) }))
    .handler(async ({ context, input }) => {
      const database = financeDatabase(context.database);
      const issue = await database.importValidationIssue.findFirst({
        where: { id: input.issueId, importBatchId: input.importBatchId, organizationId: context.organization.id },
      });
      if (!issue) throw new ORPCError("NOT_FOUND", { message: "Validation issue not found." });
      return explainCoretaxIssue({
        code: issue.code,
        fieldKey: issue.fieldKey ?? undefined,
        message: String(objectValue(issue.parameters).message ?? issue.code),
      });
    }),
};
