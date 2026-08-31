-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'user');

-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'REVIEWER', 'MEMBER');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'BANK', 'CLEARING');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('BANK_STATEMENT', 'ERP', 'CSV', 'API', 'MANUAL');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'SUBMITTED', 'APPROVED', 'COMPLETED', 'REOPENED');

-- CreateEnum
CREATE TYPE "MatchGroupStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MatchItemType" AS ENUM ('STATEMENT', 'LEDGER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReconciliationExceptionType" AS ENUM ('AMOUNT_MISMATCH', 'DATE_MISMATCH', 'DUPLICATE', 'MISSING_COUNTERPART', 'INVALID_SOURCE_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "ReconciliationExceptionSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "ReconciliationExceptionStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ReconciliationEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'SUBMITTED', 'APPROVED', 'REOPENED', 'IMPORT_METADATA_CREATED', 'IMPORT_ATTACHED', 'MATCH_CREATED', 'MATCH_REMOVED', 'EXCEPTION_CREATED', 'EXCEPTION_RESOLVED', 'COMMENT_ADDED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT,
    "displayUsername" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "defaultCurrency" CHAR(3) NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "baseCurrency" CHAR(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "sourceSystem" TEXT,
    "externalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reconciliation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "openingBalance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "statementBalance" DECIMAL(20,4),
    "reconciledBalance" DECIMAL(20,4),
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "ledgerAccountId" TEXT,
    "reconciliationId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" "ImportSource" NOT NULL,
    "sourceSystem" TEXT,
    "externalBatchId" TEXT,
    "originalFilename" TEXT,
    "contentType" TEXT,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "contentHash" TEXT,
    "sourceMetadata" JSONB,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceLineNumber" INTEGER,
    "effectiveDate" DATE NOT NULL,
    "postedAt" TIMESTAMP(3),
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "counterparty" TEXT,
    "rawData" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchGroup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "createdById" TEXT,
    "status" "MatchGroupStatus" NOT NULL DEFAULT 'PROPOSED',
    "confidence" DECIMAL(5,4),
    "matchRule" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "matchGroupId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" "MatchItemType" NOT NULL,
    "allocatedAmount" DECIMAL(20,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "assignedToId" TEXT,
    "resolvedById" TEXT,
    "type" "ReconciliationExceptionType" NOT NULL,
    "severity" "ReconciliationExceptionSeverity" NOT NULL DEFAULT 'WARNING',
    "status" "ReconciliationExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "amount" DECIMAL(20,4),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "ReconciliationEventType" NOT NULL,
    "fromStatus" "ReconciliationStatus",
    "toStatus" "ReconciliationStatus",
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account"("issuer", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_role_idx" ON "OrganizationMembership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "LegalEntity_organizationId_name_idx" ON "LegalEntity"("organizationId", "name");

-- CreateIndex
CREATE INDEX "LegalEntity_organizationId_isActive_idx" ON "LegalEntity"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_organizationId_code_key" ON "LegalEntity"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_organizationId_id_key" ON "LegalEntity"("organizationId", "id");

-- CreateIndex
CREATE INDEX "LedgerAccount_organizationId_legalEntityId_idx" ON "LedgerAccount"("organizationId", "legalEntityId");

-- CreateIndex
CREATE INDEX "LedgerAccount_organizationId_type_isActive_idx" ON "LedgerAccount"("organizationId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_organizationId_code_key" ON "LedgerAccount"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_organizationId_id_key" ON "LedgerAccount"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_organizationId_sourceSystem_externalId_key" ON "LedgerAccount"("organizationId", "sourceSystem", "externalId");

-- CreateIndex
CREATE INDEX "Reconciliation_organizationId_status_periodEnd_idx" ON "Reconciliation"("organizationId", "status", "periodEnd");

-- CreateIndex
CREATE INDEX "Reconciliation_organizationId_legalEntityId_periodEnd_idx" ON "Reconciliation"("organizationId", "legalEntityId", "periodEnd");

-- CreateIndex
CREATE INDEX "Reconciliation_ownerId_status_idx" ON "Reconciliation"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Reconciliation_ledgerAccountId_periodStart_periodEnd_key" ON "Reconciliation"("ledgerAccountId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Reconciliation_organizationId_id_key" ON "Reconciliation"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ImportBatch_organizationId_status_createdAt_idx" ON "ImportBatch"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_organizationId_legalEntityId_createdAt_idx" ON "ImportBatch"("organizationId", "legalEntityId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_ledgerAccountId_createdAt_idx" ON "ImportBatch"("ledgerAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_organizationId_reconciliationId_createdAt_idx" ON "ImportBatch"("organizationId", "reconciliationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_organizationId_sourceSystem_externalBatchId_key" ON "ImportBatch"("organizationId", "sourceSystem", "externalBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_organizationId_id_key" ON "ImportBatch"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_ledgerAccountId_effectiveDate_idx" ON "Transaction"("organizationId", "ledgerAccountId", "effectiveDate");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_reconciliationId_effectiveDate_idx" ON "Transaction"("organizationId", "reconciliationId", "effectiveDate");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_reference_idx" ON "Transaction"("organizationId", "reference");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_counterparty_idx" ON "Transaction"("organizationId", "counterparty");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_importBatchId_sourceRecordId_key" ON "Transaction"("importBatchId", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_organizationId_id_key" ON "Transaction"("organizationId", "id");

-- CreateIndex
CREATE INDEX "MatchGroup_organizationId_reconciliationId_status_idx" ON "MatchGroup"("organizationId", "reconciliationId", "status");

-- CreateIndex
CREATE INDEX "MatchGroup_createdById_createdAt_idx" ON "MatchGroup"("createdById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchGroup_organizationId_id_key" ON "MatchGroup"("organizationId", "id");

-- CreateIndex
CREATE INDEX "MatchItem_organizationId_transactionId_idx" ON "MatchItem"("organizationId", "transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchItem_matchGroupId_transactionId_key" ON "MatchItem"("matchGroupId", "transactionId");

-- CreateIndex
CREATE INDEX "ReconciliationException_organizationId_status_severity_idx" ON "ReconciliationException"("organizationId", "status", "severity");

-- CreateIndex
CREATE INDEX "ReconciliationException_reconciliationId_status_idx" ON "ReconciliationException"("reconciliationId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationException_assignedToId_status_idx" ON "ReconciliationException"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationException_transactionId_idx" ON "ReconciliationException"("transactionId");

-- CreateIndex
CREATE INDEX "ReconciliationEvent_organizationId_reconciliationId_occurre_idx" ON "ReconciliationEvent"("organizationId", "reconciliationId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReconciliationEvent_actorId_occurredAt_idx" ON "ReconciliationEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_occurredAt_idx" ON "ActivityLog"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_resourceType_resourceId_idx" ON "ActivityLog"("organizationId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_occurredAt_idx" ON "ActivityLog"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_correlationId_idx" ON "ActivityLog"("correlationId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_organizationId_legalEntityId_fkey" FOREIGN KEY ("organizationId", "legalEntityId") REFERENCES "LegalEntity"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_organizationId_legalEntityId_fkey" FOREIGN KEY ("organizationId", "legalEntityId") REFERENCES "LegalEntity"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_organizationId_ledgerAccountId_fkey" FOREIGN KEY ("organizationId", "ledgerAccountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_legalEntityId_fkey" FOREIGN KEY ("organizationId", "legalEntityId") REFERENCES "LegalEntity"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_ledgerAccountId_fkey" FOREIGN KEY ("organizationId", "ledgerAccountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_reconciliationId_fkey" FOREIGN KEY ("organizationId", "reconciliationId") REFERENCES "Reconciliation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_importBatchId_fkey" FOREIGN KEY ("organizationId", "importBatchId") REFERENCES "ImportBatch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_ledgerAccountId_fkey" FOREIGN KEY ("organizationId", "ledgerAccountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_reconciliationId_fkey" FOREIGN KEY ("organizationId", "reconciliationId") REFERENCES "Reconciliation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGroup" ADD CONSTRAINT "MatchGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGroup" ADD CONSTRAINT "MatchGroup_organizationId_reconciliationId_fkey" FOREIGN KEY ("organizationId", "reconciliationId") REFERENCES "Reconciliation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGroup" ADD CONSTRAINT "MatchGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchItem" ADD CONSTRAINT "MatchItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchItem" ADD CONSTRAINT "MatchItem_organizationId_matchGroupId_fkey" FOREIGN KEY ("organizationId", "matchGroupId") REFERENCES "MatchGroup"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchItem" ADD CONSTRAINT "MatchItem_organizationId_transactionId_fkey" FOREIGN KEY ("organizationId", "transactionId") REFERENCES "Transaction"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_organizationId_reconciliationId_fkey" FOREIGN KEY ("organizationId", "reconciliationId") REFERENCES "Reconciliation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_organizationId_transactionId_fkey" FOREIGN KEY ("organizationId", "transactionId") REFERENCES "Transaction"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationEvent" ADD CONSTRAINT "ReconciliationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationEvent" ADD CONSTRAINT "ReconciliationEvent_organizationId_reconciliationId_fkey" FOREIGN KEY ("organizationId", "reconciliationId") REFERENCES "Reconciliation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationEvent" ADD CONSTRAINT "ReconciliationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
