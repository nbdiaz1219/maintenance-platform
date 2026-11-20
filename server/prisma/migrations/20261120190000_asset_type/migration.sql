-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'Uncategorized';

-- CreateIndex
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");
