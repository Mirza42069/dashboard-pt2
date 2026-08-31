-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'AGENT');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_organizationId_userId_updatedAt_idx" ON "Conversation"("organizationId", "userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_organizationId_id_key" ON "Conversation"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ChatMessage_organizationId_conversationId_createdAt_idx" ON "ChatMessage"("organizationId", "conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_organizationId_id_key" ON "ChatMessage"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_organizationId_conversationId_fkey" FOREIGN KEY ("organizationId", "conversationId") REFERENCES "Conversation"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

