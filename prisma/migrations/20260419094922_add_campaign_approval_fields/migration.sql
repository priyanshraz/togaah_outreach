/*
  Warnings:

  - You are about to drop the column `approvalFormUrl` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `formSubmittedAt` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `instantlyCampaignId` on the `campaigns` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "targetRegion" TEXT NOT NULL,
    "campaignGoal" TEXT NOT NULL DEFAULT '',
    "campaignMessage" TEXT NOT NULL DEFAULT '',
    "selectedSheet" TEXT NOT NULL,
    "totalLeadsSent" INTEGER NOT NULL DEFAULT 0,
    "successfulSends" INTEGER NOT NULL DEFAULT 0,
    "failedSends" INTEGER NOT NULL DEFAULT 0,
    "aiGeneratedContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectedBy" TEXT,
    "rejectedAt" DATETIME,
    "rejectionReason" TEXT,
    "comments" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaigns_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_campaigns" ("aiGeneratedContent", "campaignName", "createdAt", "createdBy", "executionId", "failedSends", "id", "selectedSheet", "serviceType", "status", "successfulSends", "targetRegion", "totalLeadsSent") SELECT "aiGeneratedContent", "campaignName", "createdAt", "createdBy", "executionId", "failedSends", "id", "selectedSheet", "serviceType", "status", "successfulSends", "targetRegion", "totalLeadsSent" FROM "campaigns";
DROP TABLE "campaigns";
ALTER TABLE "new_campaigns" RENAME TO "campaigns";
CREATE UNIQUE INDEX "campaigns_executionId_key" ON "campaigns"("executionId");
CREATE INDEX "campaigns_campaignName_idx" ON "campaigns"("campaignName");
CREATE INDEX "campaigns_serviceType_idx" ON "campaigns"("serviceType");
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
