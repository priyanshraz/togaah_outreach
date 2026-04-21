-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "workflowName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "n8nExecutionId" TEXT,
    "inputData" TEXT NOT NULL,
    "outputData" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaigns" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaigns_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scraper_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "niches" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "maxResults" INTEGER NOT NULL,
    "totalScraped" INTEGER NOT NULL DEFAULT 0,
    "validEmails" INTEGER NOT NULL DEFAULT 0,
    "invalidEmails" INTEGER NOT NULL DEFAULT 0,
    "targetSheet" TEXT NOT NULL,
    "apifyRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scraper_jobs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cleanup_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "totalContacts" INTEGER NOT NULL,
    "deletedCount" INTEGER NOT NULL,
    "triggerType" TEXT NOT NULL,
    "cleanupDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cleanup_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "workflow_executions_userId_idx" ON "workflow_executions"("userId");

-- CreateIndex
CREATE INDEX "workflow_executions_workflowType_idx" ON "workflow_executions"("workflowType");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");

-- CreateIndex
CREATE INDEX "workflow_executions_createdAt_idx" ON "workflow_executions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_executionId_key" ON "campaigns"("executionId");

-- CreateIndex
CREATE INDEX "campaigns_campaignName_idx" ON "campaigns"("campaignName");

-- CreateIndex
CREATE INDEX "campaigns_serviceType_idx" ON "campaigns"("serviceType");

-- CreateIndex
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "scraper_jobs_executionId_key" ON "scraper_jobs"("executionId");

-- CreateIndex
CREATE INDEX "scraper_jobs_location_idx" ON "scraper_jobs"("location");

-- CreateIndex
CREATE INDEX "scraper_jobs_createdAt_idx" ON "scraper_jobs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cleanup_logs_executionId_key" ON "cleanup_logs"("executionId");

-- CreateIndex
CREATE INDEX "cleanup_logs_cleanupDate_idx" ON "cleanup_logs"("cleanupDate");
