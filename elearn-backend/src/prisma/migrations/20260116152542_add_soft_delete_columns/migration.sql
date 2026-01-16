-- DropIndex
DROP INDEX "Material_contentCache_idx";

-- DropIndex
DROP INDEX "Material_titleCache_idx";

-- DropIndex
DROP INDEX "Material_urlCache_idx";

-- DropIndex
DROP INDEX "Quiz_titleCache_idx";

-- DropIndex
DROP INDEX "Topic_titleCache_idx";

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "deletedAt" TIMESTAMP(3);
