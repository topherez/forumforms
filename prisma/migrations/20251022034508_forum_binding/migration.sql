-- CreateTable
CREATE TABLE "forum_bindings" (
    "id" TEXT NOT NULL,
    "companyId" VARCHAR(64) NOT NULL,
    "forumId" VARCHAR(64) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forum_bindings_companyId_idx" ON "forum_bindings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_bindings_companyId_forumId_key" ON "forum_bindings"("companyId", "forumId");
