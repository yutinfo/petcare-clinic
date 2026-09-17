-- ============================================================================
-- 001 — Row Level Security, ข้อจำกัดเชิงธุรกิจ และ trigger ที่ Prisma เขียนไม่ได้
--
-- Prisma เขียน SQL นี้ไม่ได้ จึงแยกเป็น migration ที่สอง
-- ต้องรันด้วย role ที่เป็นเจ้าของตาราง (app_migrator) ไม่ใช่ app_user
-- สคริปต์นี้ออกแบบให้รันซ้ำได้ (idempotent)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. Role ของแอป
--    app_user ต้องไม่ใช่เจ้าของตาราง มิฉะนั้น RLS จะถูกข้ามโดยอัตโนมัติ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- ----------------------------------------------------------------------------
-- 2. Row Level Security — เปิดให้ทุกตารางที่มีคอลัมน์ tenant_id
--    ตารางใหม่ที่เพิ่มภายหลังจะได้ policy อัตโนมัติเมื่อรันสคริปต์นี้ซ้ำ
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attname = 'tenant_id'
      AND NOT a.attisdropped
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t.table_name);

    -- tenant_id ที่เป็น NULL = ข้อมูลอ้างอิงกลางของระบบ (Species, Breed, DiagnosisCode)
    -- อ่านได้ทุก tenant แต่เขียนไม่ได้ผ่าน app_user
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (
          tenant_id IS NULL
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        WITH CHECK (
          tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
    $f$, t.table_name);

    RAISE NOTICE 'เปิด RLS ให้ตาราง %', t.table_name;
  END LOOP;
END $$;

-- ตรวจสอบว่าไม่มีตารางที่มี tenant_id หลุดจาก RLS (ให้ CI เรียกใช้)
CREATE OR REPLACE VIEW v_rls_coverage_gaps AS
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- ----------------------------------------------------------------------------
-- 3. กันจองทรัพยากรซ้อนกัน
--    นี่คือด่านสุดท้าย — ต่อให้โค้ดเช็คพลาดหรือมีคนกดพร้อมกันเป๊ะ ๆ ก็ซ้อนไม่ได้
-- ----------------------------------------------------------------------------
ALTER TABLE "BookingResource" DROP CONSTRAINT IF EXISTS no_double_booking;
ALTER TABLE "BookingResource"
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');

-- กรงหนึ่งใบมีสัตว์ตัวเดียวต่อช่วงเวลา
-- (กรงที่ตั้ง allow_sharing ให้จัดการที่ชั้นแอป — ยกเว้นออกจาก constraint นี้)
ALTER TABLE "Stay" DROP CONSTRAINT IF EXISTS no_kennel_overlap;
ALTER TABLE "Stay"
  ADD CONSTRAINT no_kennel_overlap
  EXCLUDE USING gist (
    kennel_resource_id WITH =,
    tstzrange(
      COALESCE(check_in_at, expected_out_at),
      COALESCE(check_out_at, expected_out_at),
      '[)'
    ) WITH &&
  ) WHERE (status IN ('RESERVED', 'CHECKED_IN'));

-- ----------------------------------------------------------------------------
-- 4. สต็อก — cache ยอดคงเหลือ + ห้ามติดลบ
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_stock_movement() RETURNS trigger AS $$
DECLARE
  new_qty numeric(14,4);
BEGIN
  IF NEW.lot_id IS NULL THEN
    RAISE EXCEPTION 'StockMovement ต้องระบุ lot_id เสมอ (ใช้ล็อตเสมือน NO-LOT สำหรับสินค้าที่ไม่ติดตามล็อต)';
  END IF;

  INSERT INTO "StockOnHand" (tenant_id, branch_id, product_id, lot_id, qty_base, updated_at)
  VALUES (NEW.tenant_id, NEW.branch_id, NEW.product_id, NEW.lot_id, NEW.qty_base, now())
  ON CONFLICT (tenant_id, branch_id, product_id, lot_id)
  DO UPDATE SET qty_base   = "StockOnHand".qty_base + EXCLUDED.qty_base,
                updated_at = now()
  RETURNING qty_base INTO new_qty;

  IF new_qty < 0 THEN
    RAISE EXCEPTION 'สต็อกไม่พอ: สินค้า % ล็อต % จะเหลือ %', NEW.product_id, NEW.lot_id, new_qty
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON "StockMovement";
CREATE TRIGGER trg_apply_stock_movement
  AFTER INSERT ON "StockMovement"
  FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();

-- ----------------------------------------------------------------------------
-- 5. ตารางที่เขียนได้อย่างเดียว (append-only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ตาราง % เป็น append-only — ห้าม %', TG_TABLE_NAME, TG_OP;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON "AuditLog";
CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_stock_movement_immutable ON "StockMovement";
CREATE TRIGGER trg_stock_movement_immutable
  BEFORE UPDATE OR DELETE ON "StockMovement"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_invoice_line_immutable ON "InvoiceLine";
CREATE TRIGGER trg_invoice_line_immutable
  BEFORE UPDATE OR DELETE ON "InvoiceLine"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_controlled_drug_immutable ON "ControlledDrugEntry";
CREATE TRIGGER trg_controlled_drug_immutable
  BEFORE UPDATE OR DELETE ON "ControlledDrugEntry"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ----------------------------------------------------------------------------
-- 6. เอกสารการเงินที่ออกแล้วห้ามแก้ (ยกเว้นการยกเลิกและยอดชำระ)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_issued_invoice() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'DRAFT' THEN
    RETURN NEW;                      -- ร่างยังแก้ได้
  END IF;

  IF NEW.number            IS DISTINCT FROM OLD.number
     OR NEW.doc_type       IS DISTINCT FROM OLD.doc_type
     OR NEW.issued_at      IS DISTINCT FROM OLD.issued_at
     OR NEW.owner_id       IS DISTINCT FROM OLD.owner_id
     OR NEW.buyer_name     IS DISTINCT FROM OLD.buyer_name
     OR NEW.buyer_tax_id   IS DISTINCT FROM OLD.buyer_tax_id
     OR NEW.subtotal_satang    IS DISTINCT FROM OLD.subtotal_satang
     OR NEW.vat_satang         IS DISTINCT FROM OLD.vat_satang
     OR NEW.grand_total_satang IS DISTINCT FROM OLD.grand_total_satang
  THEN
    RAISE EXCEPTION
      'ใบกำกับภาษี/ใบเสร็จที่ออกแล้วแก้ไขไม่ได้ — ให้ยกเลิกแล้วออกใหม่ หรือออกใบลดหนี้';
  END IF;

  RETURN NEW;                        -- ปล่อยให้แก้ paid/balance/status/voided_* ได้
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_issued_invoice ON "Invoice";
CREATE TRIGGER trg_protect_issued_invoice
  BEFORE UPDATE ON "Invoice"
  FOR EACH ROW EXECUTE FUNCTION protect_issued_invoice();

DROP TRIGGER IF EXISTS trg_invoice_no_delete ON "Invoice";
CREATE TRIGGER trg_invoice_no_delete
  BEFORE DELETE ON "Invoice"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ----------------------------------------------------------------------------
-- 7. เวชระเบียนที่ลงนามแล้วห้ามแก้ — ต้องใช้ addendum
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_signed_soap() RETURNS trigger AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL AND (
       NEW.subjective IS DISTINCT FROM OLD.subjective OR
       NEW.objective  IS DISTINCT FROM OLD.objective  OR
       NEW.assessment IS DISTINCT FROM OLD.assessment OR
       NEW.plan       IS DISTINCT FROM OLD.plan)
  THEN
    RAISE EXCEPTION 'เวชระเบียนที่ลงนามแล้วแก้ไขไม่ได้ ให้เพิ่มเป็น addendum แทน';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_signed_soap ON "SoapNote";
CREATE TRIGGER trg_protect_signed_soap
  BEFORE UPDATE ON "SoapNote"
  FOR EACH ROW EXECUTE FUNCTION protect_signed_soap();

-- ----------------------------------------------------------------------------
-- 8. ค้นหาภาษาไทย — normalize + ดัชนี trigram
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION th_normalize(txt text) RETURNS text AS $$
  SELECT lower(regexp_replace(COALESCE(txt, ''), '[[:space:]\-\.]', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION owner_search_key() RETURNS trigger AS $$
BEGIN
  NEW.search_key := th_normalize(
    COALESCE(NEW.first_name,'') || COALESCE(NEW.last_name,'') ||
    COALESCE(NEW.nickname,'')   || COALESCE(NEW.code,'')
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_owner_search_key ON "Owner";
CREATE TRIGGER trg_owner_search_key
  BEFORE INSERT OR UPDATE ON "Owner"
  FOR EACH ROW EXECUTE FUNCTION owner_search_key();

CREATE OR REPLACE FUNCTION pet_search_key() RETURNS trigger AS $$
BEGIN
  NEW.search_key := th_normalize(
    COALESCE(NEW.name,'') || COALESCE(NEW.code,'') || COALESCE(NEW.microchip_no,'')
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pet_search_key ON "Pet";
CREATE TRIGGER trg_pet_search_key
  BEFORE INSERT OR UPDATE ON "Pet"
  FOR EACH ROW EXECUTE FUNCTION pet_search_key();

CREATE INDEX IF NOT EXISTS owner_search_trgm  ON "Owner"   USING gin (search_key gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pet_search_trgm    ON "Pet"     USING gin (search_key gin_trgm_ops);
CREATE INDEX IF NOT EXISTS product_search_trgm ON "Product" USING gin (search_key gin_trgm_ops);

-- ค้นเบอร์โทรด้วยเลข 4 ตัวท้าย
CREATE INDEX IF NOT EXISTS owner_phone_suffix
  ON "OwnerPhone" (tenant_id, reverse(digits) varchar_pattern_ops);

-- ----------------------------------------------------------------------------
-- 9. ยาควบคุม — สร้างทะเบียนอัตโนมัติจากทุกการเคลื่อนไหว
--
-- ⚠ ลำดับ trigger สำคัญ: PostgreSQL เรียก AFTER INSERT trigger ตามลำดับชื่อ
--   trg_apply_stock_movement < trg_log_controlled_drug (a < l) จึงรับประกันว่า
--   StockOnHand ถูกอัปเดตแล้วตอนคำนวณ balance_after_base
--   >> ถ้าเปลี่ยนชื่อ trigger ต้องรักษาลำดับนี้ไว้
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_controlled_drug() RETURNS trigger AS $$
DECLARE
  is_controlled boolean;
  balance numeric(14,4);
BEGIN
  SELECT p.is_controlled INTO is_controlled
  FROM "Product" p WHERE p.id = NEW.product_id;

  IF NOT COALESCE(is_controlled, false) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(qty_base), 0) INTO balance
  FROM "StockOnHand"
  WHERE tenant_id = NEW.tenant_id AND branch_id = NEW.branch_id
    AND product_id = NEW.product_id;

  INSERT INTO "ControlledDrugEntry"
    (id, tenant_id, branch_id, product_id, movement_id, qty_base,
     balance_after_base, performed_by_id, occurred_at)
  VALUES
    (gen_random_uuid(), NEW.tenant_id, NEW.branch_id, NEW.product_id, NEW.id,
     NEW.qty_base, balance, NEW.performed_by_id, NEW.occurred_at);

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_controlled_drug ON "StockMovement";
CREATE TRIGGER trg_log_controlled_drug
  AFTER INSERT ON "StockMovement"
  FOR EACH ROW EXECUTE FUNCTION log_controlled_drug();

-- ----------------------------------------------------------------------------
-- 10. ข้อจำกัดเชิงธุรกิจอื่น ๆ
-- ----------------------------------------------------------------------------
ALTER TABLE "Booking"       DROP CONSTRAINT IF EXISTS booking_time_order;
ALTER TABLE "Booking"       ADD CONSTRAINT booking_time_order CHECK (end_at > start_at);

ALTER TABLE "Stay"          DROP CONSTRAINT IF EXISTS stay_time_order;
ALTER TABLE "Stay"          ADD CONSTRAINT stay_time_order
  CHECK (check_out_at IS NULL OR check_in_at IS NULL OR check_out_at >= check_in_at);

ALTER TABLE "ChargeItem"    DROP CONSTRAINT IF EXISTS charge_amount_nonneg;
ALTER TABLE "ChargeItem"    ADD CONSTRAINT charge_amount_nonneg CHECK (amount_satang >= 0);

ALTER TABLE "Payment"       DROP CONSTRAINT IF EXISTS payment_amount_positive;
ALTER TABLE "Payment"       ADD CONSTRAINT payment_amount_positive CHECK (amount_satang > 0);

ALTER TABLE "ProductUnit"   DROP CONSTRAINT IF EXISTS unit_factor_positive;
ALTER TABLE "ProductUnit"   ADD CONSTRAINT unit_factor_positive CHECK (factor_to_base > 0);

-- ChargeItem ต้องมี source id ตรงกับ sourceType
ALTER TABLE "ChargeItem"    DROP CONSTRAINT IF EXISTS charge_source_consistent;
ALTER TABLE "ChargeItem"    ADD CONSTRAINT charge_source_consistent CHECK (
  (source_type = 'ENCOUNTER'       AND encounter_id    IS NOT NULL) OR
  (source_type = 'STAY'            AND stay_id         IS NOT NULL) OR
  (source_type = 'GROOMING'        AND grooming_job_id IS NOT NULL) OR
  (source_type = 'POS'             AND pos_sale_id     IS NOT NULL) OR
  (source_type = 'BOOKING_DEPOSIT' AND booking_id      IS NOT NULL) OR
  (source_type = 'MANUAL')
);

-- ใบกำกับภาษีเต็มรูปต้องมีข้อมูลผู้ซื้อครบ
ALTER TABLE "Invoice"       DROP CONSTRAINT IF EXISTS full_tax_invoice_requires_buyer;
ALTER TABLE "Invoice"       ADD CONSTRAINT full_tax_invoice_requires_buyer CHECK (
  doc_type <> 'FULL_TAX_INVOICE'
  OR status = 'DRAFT'
  OR (buyer_name IS NOT NULL AND buyer_address IS NOT NULL)
);

-- เอกสารที่ออกแล้วต้องมีเลขที่
ALTER TABLE "Invoice"       DROP CONSTRAINT IF EXISTS issued_invoice_has_number;
ALTER TABLE "Invoice"       ADD CONSTRAINT issued_invoice_has_number CHECK (
  status = 'DRAFT' OR (number IS NOT NULL AND issued_at IS NOT NULL)
);

-- ----------------------------------------------------------------------------
-- 11. LISTEN/NOTIFY สำหรับ whiteboard และผังกรงแบบเรียลไทม์
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_board_change() RETURNS trigger AS $$
DECLARE
  rec record;
BEGIN
  rec := COALESCE(NEW, OLD);
  PERFORM pg_notify(
    'board_change',
    json_build_object(
      'tenantId', rec.tenant_id,
      'branchId', rec.branch_id,
      'entity',   TG_TABLE_NAME,
      'id',       rec.id,
      'op',       TG_OP
    )::text
  );
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_encounter ON "Encounter";
CREATE TRIGGER trg_notify_encounter
  AFTER INSERT OR UPDATE OR DELETE ON "Encounter"
  FOR EACH ROW EXECUTE FUNCTION notify_board_change();

DROP TRIGGER IF EXISTS trg_notify_stay ON "Stay";
CREATE TRIGGER trg_notify_stay
  AFTER INSERT OR UPDATE OR DELETE ON "Stay"
  FOR EACH ROW EXECUTE FUNCTION notify_board_change();

DROP TRIGGER IF EXISTS trg_notify_grooming ON "GroomingJob";
CREATE TRIGGER trg_notify_grooming
  AFTER INSERT OR UPDATE OR DELETE ON "GroomingJob"
  FOR EACH ROW EXECUTE FUNCTION notify_board_change();
