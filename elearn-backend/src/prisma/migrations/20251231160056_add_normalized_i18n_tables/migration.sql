-- CreateTable
CREATE TABLE "I18nKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'common',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "I18nKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "I18nValue" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "I18nValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "I18nKey_namespace_idx" ON "I18nKey"("namespace");

-- CreateIndex
CREATE INDEX "I18nKey_key_idx" ON "I18nKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "I18nKey_namespace_key_key" ON "I18nKey"("namespace", "key");

-- CreateIndex
CREATE INDEX "I18nValue_keyId_idx" ON "I18nValue"("keyId");

-- CreateIndex
CREATE INDEX "I18nValue_lang_idx" ON "I18nValue"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "I18nValue_keyId_lang_key" ON "I18nValue"("keyId", "lang");

-- AddForeignKey
ALTER TABLE "I18nValue" ADD CONSTRAINT "I18nValue_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "I18nKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
