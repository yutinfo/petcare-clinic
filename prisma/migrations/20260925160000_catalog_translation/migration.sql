-- คำแปลแค็ตตาล็อกตาม locale เพื่อนำเข้าภาษาเพิ่มโดยไม่เพิ่มคอลัมน์
CREATE TABLE "CatalogTranslation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "CatalogTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogTranslation_tenant_id_entity_type_entity_id_field_locale_key"
  ON "CatalogTranslation"("tenant_id", "entity_type", "entity_id", "field", "locale");
CREATE INDEX "CatalogTranslation_tenant_id_entity_type_locale_idx"
  ON "CatalogTranslation"("tenant_id", "entity_type", "locale");

ALTER TABLE "CatalogTranslation" ADD CONSTRAINT catalog_translation_text_nonempty CHECK (char_length(text) > 0);

GRANT SELECT, INSERT, UPDATE, DELETE ON "CatalogTranslation" TO app_user;

ALTER TABLE "CatalogTranslation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatalogTranslation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CatalogTranslation";
CREATE POLICY tenant_isolation ON "CatalogTranslation"
  USING (
    tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
