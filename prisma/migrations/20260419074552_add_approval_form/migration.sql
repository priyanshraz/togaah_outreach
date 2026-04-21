-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "targetRegion" TEXT NOT NULL,
    "selectedSheet" TEXT NOT NULL,
    "totalLeadsSent" INTEGER NOT NULL DEFAULT 0,
    "successfulSends" INTEGER NOT NULL DEFAULT 0,
    "failedSends" INTEGER NOT NULL DEFAULT 0,
    "instantlyCampaignId" TEXT,
    "approvalFormUrl" TEXT,
    "formSubmittedAt" DATETIME,
    "aiGeneratedContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaigns_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_campaigns" ("campaignName", "createdAt", "executionId", "failedSends", "id", "instantlyCampaignId", "selectedSheet", "serviceType", "successfulSends", "targetRegion", "totalLeadsSent") SELECT "campaignName", "createdAt", "executionId", "failedSends", "id", "instantlyCampaignId", "selectedSheet", "serviceType", "successfulSends", "targetRegion", "totalLeadsSent" FROM "campaigns";
DROP TABLE "campaigns";
ALTER TABLE "new_campaigns" RENAME TO "campaigns";
CREATE UNIQUE INDEX "campaigns_executionId_key" ON "campaigns"("executionId");
CREATE INDEX "campaigns_campaignName_idx" ON "campaigns"("campaignName");
CREATE INDEX "campaigns_serviceType_idx" ON "campaigns"("serviceType");
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
