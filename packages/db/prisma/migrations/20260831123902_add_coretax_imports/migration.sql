-- CreateEnum
CREATE TYPE "CoretaxDocumentType" AS ENUM ('FAKTUR_KELUARAN', 'BPPU');

-- CreateEnum
CREATE TYPE "ImportArtifactKind" AS ENUM ('ORIGINAL_FILE', 'CORETAX_XML');

-- CreateEnum
CREATE TYPE "ImportValidationStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportValidationSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "columnMapping" JSONB,
ADD COLUMN     "configuredSheet" TEXT,
ADD COLUMN     "dataVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "documentType" "CoretaxDocumentType",
ADD COLUMN     "rulesetVersion" TEXT;

-- CreateTable
CREATE TABLE "ImportArtifact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "validationRunId" TEXT,
    "createdById" TEXT,
    "kind" "ImportArtifactKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "inputDataVersion" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "objectPath" TEXT NOT NULL,
    "etag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sourceLocator" TEXT NOT NULL,
    "sourceSheet" TEXT,
    "sourceRowNumber" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportCellEdit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "importRowId" TEXT NOT NULL,
    "editedById" TEXT,
    "fieldKey" TEXT NOT NULL,
    "previousValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "previousRowVersion" INTEGER NOT NULL,
    "rowVersion" INTEGER NOT NULL,
    "batchDataVersion" INTEGER NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportCellEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportValidationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "requestedById" TEXT,
    "inputDataVersion" INTEGER NOT NULL,
    "ruleset" "CoretaxDocumentType" NOT NULL,
    "rulesetVersion" TEXT NOT NULL,
    "status" "ImportValidationStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "infoCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportValidationIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "validationRunId" TEXT NOT NULL,
    "importRowId" TEXT,
    "severity" "ImportValidationSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "fieldKey" TEXT,
    "parameters" JSONB,
    "invalidValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportValidationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportArtifact_objectPath_key" ON "ImportArtifact"("objectPath");

-- CreateIndex
CREATE INDEX "ImportArtifact_organizationId_importBatchId_kind_createdAt_idx" ON "ImportArtifact"("organizationId", "importBatchId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportArtifact_organizationId_id_key" ON "ImportArtifact"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ImportArtifact_importBatchId_kind_version_key" ON "ImportArtifact"("importBatchId", "kind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ImportArtifact_importBatchId_kind_inputDataVersion_key" ON "ImportArtifact"("importBatchId", "kind", "inputDataVersion");

-- CreateIndex
CREATE INDEX "ImportRow_organizationId_importBatchId_sortOrder_idx" ON "ImportRow"("organizationId", "importBatchId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_organizationId_id_key" ON "ImportRow"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_organizationId_importBatchId_id_key" ON "ImportRow"("organizationId", "importBatchId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_importBatchId_sourceLocator_key" ON "ImportRow"("importBatchId", "sourceLocator");

-- CreateIndex
CREATE INDEX "ImportCellEdit_organizationId_importBatchId_editedAt_idx" ON "ImportCellEdit"("organizationId", "importBatchId", "editedAt");

-- CreateIndex
CREATE INDEX "ImportCellEdit_editedById_editedAt_idx" ON "ImportCellEdit"("editedById", "editedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportCellEdit_importRowId_rowVersion_key" ON "ImportCellEdit"("importRowId", "rowVersion");

-- CreateIndex
CREATE INDEX "ImportValidationRun_organizationId_importBatchId_createdAt_idx" ON "ImportValidationRun"("organizationId", "importBatchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportValidationRun_organizationId_id_key" ON "ImportValidationRun"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ImportValidationRun_organizationId_importBatchId_id_key" ON "ImportValidationRun"("organizationId", "importBatchId", "id");

-- CreateIndex
CREATE INDEX "ImportValidationIssue_organizationId_importBatchId_validati_idx" ON "ImportValidationIssue"("organizationId", "importBatchId", "validationRunId", "severity");

-- CreateIndex
CREATE INDEX "ImportValidationIssue_organizationId_importRowId_fieldKey_idx" ON "ImportValidationIssue"("organizationId", "importRowId", "fieldKey");

-- AddForeignKey
ALTER TABLE "ImportArtifact" ADD CONSTRAINT "ImportArtifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportArtifact" ADD CONSTRAINT "ImportArtifact_organizationId_importBatchId_fkey" FOREIGN KEY ("organizationId", "importBatchId") REFERENCES "ImportBatch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportArtifact" ADD CONSTRAINT "ImportArtifact_organizationId_importBatchId_validationRunI_fkey" FOREIGN KEY ("organizationId", "importBatchId", "validationRunId") REFERENCES "ImportValidationRun"("organizationId", "importBatchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportArtifact" ADD CONSTRAINT "ImportArtifact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_organizationId_importBatchId_fkey" FOREIGN KEY ("organizationId", "importBatchId") REFERENCES "ImportBatch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCellEdit" ADD CONSTRAINT "ImportCellEdit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCellEdit" ADD CONSTRAINT "ImportCellEdit_organizationId_importBatchId_importRowId_fkey" FOREIGN KEY ("organizationId", "importBatchId", "importRowId") REFERENCES "ImportRow"("organizationId", "importBatchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCellEdit" ADD CONSTRAINT "ImportCellEdit_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationRun" ADD CONSTRAINT "ImportValidationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationRun" ADD CONSTRAINT "ImportValidationRun_organizationId_importBatchId_fkey" FOREIGN KEY ("organizationId", "importBatchId") REFERENCES "ImportBatch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationRun" ADD CONSTRAINT "ImportValidationRun_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationIssue" ADD CONSTRAINT "ImportValidationIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationIssue" ADD CONSTRAINT "ImportValidationIssue_organizationId_importBatchId_validat_fkey" FOREIGN KEY ("organizationId", "importBatchId", "validationRunId") REFERENCES "ImportValidationRun"("organizationId", "importBatchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationIssue" ADD CONSTRAINT "ImportValidationIssue_organizationId_importBatchId_importR_fkey" FOREIGN KEY ("organizationId", "importBatchId", "importRowId") REFERENCES "ImportRow"("organizationId", "importBatchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
