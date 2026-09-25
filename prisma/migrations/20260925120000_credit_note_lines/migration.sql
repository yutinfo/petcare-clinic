-- บรรทัดใบลดหนี้ สำหรับคืนสินค้าเป็นรายการ และคืนสต็อกตามจำนวน
CREATE TABLE "CreditNoteLine" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "invoice_line_id" UUID,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "amount_satang" INTEGER NOT NULL,
    "vat_satang" INTEGER NOT NULL,
    "product_id" UUID,
    CONSTRAINT "CreditNoteLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditNoteLine_tenant_id_credit_note_id_idx" ON "CreditNoteLine"("tenant_id", "credit_note_id");

ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "CreditNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "InvoiceLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditNoteLine" ADD CONSTRAINT credit_note_line_amount_nonneg CHECK (amount_satang >= 0 AND vat_satang >= 0 AND qty > 0);

GRANT SELECT, INSERT, UPDATE, DELETE ON "CreditNoteLine" TO app_user;

ALTER TABLE "CreditNoteLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditNoteLine" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CreditNoteLine";
CREATE POLICY tenant_isolation ON "CreditNoteLine"
  USING (
    tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
