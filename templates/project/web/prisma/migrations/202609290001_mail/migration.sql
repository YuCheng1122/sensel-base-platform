-- CreateTable
CREATE TABLE "MailConfiguration" (
    "id" TEXT NOT NULL DEFAULT 'mail',
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MailConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailDelivery" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "to" TEXT[],
    "subject" TEXT NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "synthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailSettingsAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "secretChanged" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailSettingsAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailDelivery_idempotencyKey_key" ON "MailDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MailDelivery_createdAt_idx" ON "MailDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "MailSettingsAudit_createdAt_idx" ON "MailSettingsAudit"("createdAt");

