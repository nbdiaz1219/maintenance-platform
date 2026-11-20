-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "caseId" TEXT;

-- CreateTable
CREATE TABLE "TravelCase" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TravelCase_serialNumber_key" ON "TravelCase"("serialNumber");

-- CreateIndex
CREATE INDEX "TravelCase_siteId_idx" ON "TravelCase"("siteId");

-- CreateIndex
CREATE INDEX "Asset_caseId_idx" ON "Asset"("caseId");

-- AddForeignKey
ALTER TABLE "TravelCase" ADD CONSTRAINT "TravelCase_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "TravelCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
