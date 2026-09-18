-- DEF-03: ลงนามแล้วห้ามล้างลายเซ็น / เปลี่ยนผู้ลงนาม / ลบ
CREATE OR REPLACE FUNCTION protect_signed_soap() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.signed_at IS NOT NULL THEN
      RAISE EXCEPTION 'เวชระเบียนที่ลงนามแล้วลบไม่ได้ ให้เพิ่มเป็น addendum แทน';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.signed_at IS NOT NULL THEN
    IF NEW.signed_at IS DISTINCT FROM OLD.signed_at
       OR NEW.signed_by_id IS DISTINCT FROM OLD.signed_by_id
       OR NEW.subjective IS DISTINCT FROM OLD.subjective
       OR NEW.objective  IS DISTINCT FROM OLD.objective
       OR NEW.assessment IS DISTINCT FROM OLD.assessment
       OR NEW.plan       IS DISTINCT FROM OLD.plan
    THEN
      RAISE EXCEPTION 'เวชระเบียนที่ลงนามแล้วแก้ไขไม่ได้ ให้เพิ่มเป็น addendum แทน';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_signed_soap ON "SoapNote";
CREATE TRIGGER trg_protect_signed_soap
  BEFORE UPDATE OR DELETE ON "SoapNote"
  FOR EACH ROW EXECUTE FUNCTION protect_signed_soap();

-- DEF-05: บิลที่พ้น DRAFT แล้วย้อน DRAFT / แก้ snapshot ไม่ได้
CREATE OR REPLACE FUNCTION protect_issued_invoice() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'DRAFT' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'DRAFT' THEN
    RAISE EXCEPTION
      'ใบกำกับภาษี/ใบเสร็จที่ออกแล้วย้อนเป็นร่างไม่ได้ — ให้ยกเลิกแล้วออกใหม่ หรือออกใบลดหนี้';
  END IF;

  IF NEW.number                 IS DISTINCT FROM OLD.number
     OR NEW.doc_type            IS DISTINCT FROM OLD.doc_type
     OR NEW.issued_at           IS DISTINCT FROM OLD.issued_at
     OR NEW.owner_id            IS DISTINCT FROM OLD.owner_id
     OR NEW.buyer_name          IS DISTINCT FROM OLD.buyer_name
     OR NEW.buyer_tax_id        IS DISTINCT FROM OLD.buyer_tax_id
     OR NEW.buyer_address       IS DISTINCT FROM OLD.buyer_address
     OR NEW.buyer_branch_code   IS DISTINCT FROM OLD.buyer_branch_code
     OR NEW.seller_name         IS DISTINCT FROM OLD.seller_name
     OR NEW.seller_tax_id       IS DISTINCT FROM OLD.seller_tax_id
     OR NEW.seller_address      IS DISTINCT FROM OLD.seller_address
     OR NEW.seller_branch_code  IS DISTINCT FROM OLD.seller_branch_code
     OR NEW.price_includes_vat  IS DISTINCT FROM OLD.price_includes_vat
     OR NEW.subtotal_satang     IS DISTINCT FROM OLD.subtotal_satang
     OR NEW.vat_base_satang     IS DISTINCT FROM OLD.vat_base_satang
     OR NEW.vat_satang          IS DISTINCT FROM OLD.vat_satang
     OR NEW.exempt_satang       IS DISTINCT FROM OLD.exempt_satang
     OR NEW.grand_total_satang  IS DISTINCT FROM OLD.grand_total_satang
  THEN
    RAISE EXCEPTION
      'ใบกำกับภาษี/ใบเสร็จที่ออกแล้วแก้ไขไม่ได้ — ให้ยกเลิกแล้วออกใหม่ หรือออกใบลดหนี้';
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;
