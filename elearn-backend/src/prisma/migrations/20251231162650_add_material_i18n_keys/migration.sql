-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "contentKeyId" TEXT,
ADD COLUMN     "titleKeyId" TEXT;

-- CreateIndex
CREATE INDEX "Material_titleKeyId_idx" ON "Material"("titleKeyId");

-- CreateIndex
CREATE INDEX "Material_contentKeyId_idx" ON "Material"("contentKeyId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_titleKeyId_fkey" FOREIGN KEY ("titleKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_contentKeyId_fkey" FOREIGN KEY ("contentKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
