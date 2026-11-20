-- CreateTable
CREATE TABLE "AssetType" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetType_siteId_sortOrder_idx" ON "AssetType"("siteId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssetType_siteId_name_key" ON "AssetType"("siteId", "name");

-- AddForeignKey
ALTER TABLE "AssetType" ADD CONSTRAINT "AssetType_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
