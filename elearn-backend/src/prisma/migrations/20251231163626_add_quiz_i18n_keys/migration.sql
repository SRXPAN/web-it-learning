-- AlterTable
ALTER TABLE "Option" ADD COLUMN     "textKeyId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "explanationKeyId" TEXT,
ADD COLUMN     "textKeyId" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "titleKeyId" TEXT;

-- CreateIndex
CREATE INDEX "Option_textKeyId_idx" ON "Option"("textKeyId");

-- CreateIndex
CREATE INDEX "Question_textKeyId_idx" ON "Question"("textKeyId");

-- CreateIndex
CREATE INDEX "Question_explanationKeyId_idx" ON "Question"("explanationKeyId");

-- CreateIndex
CREATE INDEX "Quiz_titleKeyId_idx" ON "Quiz"("titleKeyId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_titleKeyId_fkey" FOREIGN KEY ("titleKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_textKeyId_fkey" FOREIGN KEY ("textKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_explanationKeyId_fkey" FOREIGN KEY ("explanationKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_textKeyId_fkey" FOREIGN KEY ("textKeyId") REFERENCES "I18nKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
