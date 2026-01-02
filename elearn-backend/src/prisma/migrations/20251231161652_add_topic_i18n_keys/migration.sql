-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "descKeyId" TEXT,
ADD COLUMN     "titleKeyId" TEXT;

-- CreateIndex
CREATE INDEX "Topic_titleKeyId_idx" ON "Topic"("titleKeyId");

-- CreateIndex
CREATE INDEX "Topic_descKeyId_idx" ON "Topic"("descKeyId");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_titleKeyId_fkey" FOREIGN KEY ("titleKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_descKeyId_fkey" FOREIGN KEY ("descKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
