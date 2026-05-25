-- AlterTable
ALTER TABLE "employees" ADD COLUMN "wecomUserId" TEXT;

-- CreateTable
CREATE TABLE "external_contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "followUserId" TEXT NOT NULL,
    "followUserName" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_training_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceAudioPath" TEXT,
    "sourceTranscript" TEXT,
    "summary" TEXT,
    "deadline" DATETIME,
    "wecomWebhookUrl" TEXT,
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_training_sessions" ("createdAt", "deadline", "id", "sourceAudioPath", "sourceTranscript", "status", "summary", "title", "updatedAt", "wecomWebhookUrl") SELECT "createdAt", "deadline", "id", "sourceAudioPath", "sourceTranscript", "status", "summary", "title", "updatedAt", "wecomWebhookUrl" FROM "training_sessions";
DROP TABLE "training_sessions";
ALTER TABLE "new_training_sessions" RENAME TO "training_sessions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "external_contacts_externalUserId_key" ON "external_contacts"("externalUserId");
