-- CreateTable
CREATE TABLE "company_post_field_schemas" (
    "id" TEXT NOT NULL,
    "companyId" VARCHAR(64) NOT NULL,
    "schemaJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_post_field_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_metadata" (
    "id" TEXT NOT NULL,
    "postId" VARCHAR(64) NOT NULL,
    "companyId" VARCHAR(64) NOT NULL,
    "createdByUserId" VARCHAR(64) NOT NULL,
    "dataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_post_field_schemas_companyId_idx" ON "company_post_field_schemas"("companyId");

-- CreateIndex
CREATE INDEX "post_metadata_postId_idx" ON "post_metadata"("postId");

-- CreateIndex
CREATE INDEX "post_metadata_companyId_idx" ON "post_metadata"("companyId");
