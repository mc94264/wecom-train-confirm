-- CreateTable
CREATE TABLE "model_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "defaultBaseUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "model_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKeyRef" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "model_connections_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "model_providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_specs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "capability" TEXT NOT NULL,
    "modelConnectionId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "agent_specs_modelConnectionId_fkey" FOREIGN KEY ("modelConnectionId") REFERENCES "model_connections" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "model_providers_key_key" ON "model_providers"("key");

-- CreateIndex
CREATE UNIQUE INDEX "agent_specs_agentKey_key" ON "agent_specs"("agentKey");

-- CreateIndex
CREATE UNIQUE INDEX "service_configs_serviceKey_key" ON "service_configs"("serviceKey");
