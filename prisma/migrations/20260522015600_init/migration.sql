-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceAudioPath" TEXT,
    "sourceTranscript" TEXT,
    "summary" TEXT,
    "deadline" DATETIME,
    "wecomWebhookUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "training_key_points" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "training_key_points_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "phone" TEXT,
    "employeeCode" TEXT
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "uniqueToken" TEXT NOT NULL,
    "pushedAt" DATETIME,
    "openedAt" DATETIME,
    "repliedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    CONSTRAINT "training_assignments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employee_replies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "audioPath" TEXT,
    "transcript" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_replies_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "understanding_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "replyId" TEXT NOT NULL,
    "coverageScore" INTEGER,
    "accuracyScore" INTEGER,
    "overallScore" INTEGER,
    "level" TEXT,
    "coveredPoints" TEXT,
    "missingPoints" TEXT,
    "wrongPoints" TEXT,
    "riskLevel" TEXT,
    "summary" TEXT,
    "correctionSuggestion" TEXT,
    "rawAiResult" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "understanding_analyses_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "employee_replies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_uniqueToken_key" ON "training_assignments"("uniqueToken");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_sessionId_employeeId_key" ON "training_assignments"("sessionId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_replies_assignmentId_key" ON "employee_replies"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "understanding_analyses_replyId_key" ON "understanding_analyses"("replyId");
