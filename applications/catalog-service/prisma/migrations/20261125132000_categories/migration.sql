CREATE TABLE "categories" (
 "id" UUID NOT NULL PRIMARY KEY,
 "name" VARCHAR(120) NOT NULL,
 "slug" VARCHAR(120) NOT NULL UNIQUE,
 "description" TEXT,
 "image_url" TEXT,
 "parent_id" UUID,
 CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");
