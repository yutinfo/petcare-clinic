import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://app_migrator:app_migrator_dev@localhost:5432/petcare?schema=public" },
  },
});

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill("demo1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/bkk(\/|$)/, { timeout: 30_000 });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("ผู้จัดการออกใบลดหนี้จากบิลที่ยังค้าง และยอดบนใบกำกับเดิมไม่เปลี่ยน", async ({ page }) => {
  const branch = await prisma.branch.findFirstOrThrow({ where: { code: "BKK" } });
  const owner = await prisma.owner.findFirstOrThrow({
    where: { tenantId: branch.tenantId, firstName: "แพร" },
  });
  const profile = await prisma.taxProfile.findUniqueOrThrow({ where: { branchId: branch.id } });
  const stamp = Date.now().toString().slice(-8);
  const number = `INV-BKK-E2E-${stamp}`;
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: branch.tenantId,
      branchId: branch.id,
      docType: "FULL_TAX_INVOICE",
      number,
      ownerId: owner.id,
      status: "ISSUED",
      issuedAt: new Date(),
      buyerName: "แพร ใจดี",
      buyerAddress: "กรุงเทพฯ",
      sellerName: profile.sellerName,
      sellerTaxId: profile.taxId,
      sellerAddress: profile.sellerAddress,
      sellerBranchCode: profile.taxBranchCode,
      priceIncludesVat: true,
      subtotalSatang: 35_000,
      vatBaseSatang: 32_710,
      vatSatang: 2_290,
      grandTotalSatang: 35_000,
      paidSatang: 0,
      balanceSatang: 35_000,
    },
  });

  await login(page, "ann@demo.local");
  await page.goto("/bkk/billing");
  await expect(page.getByRole("heading", { name: "ลดยอดบิลที่ออกแล้ว" })).toBeVisible();

  const hint = page.getByText("เป็นยอดสุทธิที่ควรเป็นหลังใบนี้");
  await expect(hint).toBeVisible();
  const hintSize = await hint.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(hintSize).toBeGreaterThanOrEqual(13);
  const hintColor = await hint.evaluate((el) => getComputedStyle(el).color);
  expect(hintColor === "rgb(120, 113, 108)" || hintColor.startsWith("oklch(0.553")).toBe(true);

  const issueButton = page.getByRole("button", { name: "ออกใบลดหนี้" });
  await expect(issueButton).toBeDisabled();
  const disabledColor = await issueButton.evaluate((el) => getComputedStyle(el).color);
  const disabledBg = await issueButton.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(disabledColor === "rgb(87, 83, 78)" || disabledColor.startsWith("oklch(0.444")).toBe(true);
  expect(disabledBg === "rgb(231, 229, 228)" || disabledBg.startsWith("oklch(0.923")).toBe(true);

  await page.getByLabel("บิลที่ออกแล้ว").selectOption(invoice.id);
  await page.getByLabel("ยอดที่ถูกต้อง (บาท)").fill("200");
  await expect(page.getByText("150.00 บาท").first()).toBeVisible();
  await expect(page.getByText("9.81 บาท")).toBeVisible();
  await page.getByLabel("รายละเอียด").fill("คิดค่าตรวจสูงไป");

  page.once("dialog", (dialog) => dialog.accept());
  await issueButton.click();
  await page.waitForURL(/\/bkk\/billing\/credit-notes\/[0-9a-f-]{36}/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "ใบลดหนี้" })).toBeVisible();
  await expect(page.getByText(number)).toBeVisible();
  await expect(page.getByText("คิดค่าตรวจสูงไป")).toBeVisible();
  await expect(page.getByText(/CN-BKK-\d{4}-\d{6}/)).toBeVisible();

  const row = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
  expect(row.grandTotalSatang).toBe(35_000);
  expect(row.vatSatang).toBe(2_290);
  expect(row.balanceSatang).toBe(20_000);
  const notes = await prisma.creditNote.findMany({ where: { invoiceId: invoice.id } });
  expect(notes).toHaveLength(1);
  expect(notes[0]?.vatSatang).toBe(981);
});

test("ข้อความช่วย ป้ายช่องกรอก และเคาน์เตอร์หลังเลือกสัตว์ ใช้ได้ทั้งจอกว้างและจอมือถือ", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, "nune@demo.local");

  await page.goto("/bkk/billing");
  await expect(page.getByRole("heading", { name: "ลดยอดบิลที่ออกแล้ว" })).toHaveCount(0);
  const navHint = page.getByText("กะเงินสดและใบลดหนี้");
  await expect(navHint).toBeVisible();
  const navSize = await navHint.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(navSize).toBeGreaterThanOrEqual(13);

  await page.goto("/bkk/reception");
  await page.getByLabel("ค้นหาเจ้าของหรือสัตว์").fill("ข้าวปุ้น");
  await page.getByRole("button", { name: /ข้าวปุ้น/ }).click();
  await expect(page.getByRole("heading", { name: /ข้าวปุ้น · แพร/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "เปลี่ยนสัตว์" })).toBeVisible();
  await expect(page.getByRole("button", { name: "เปิดเคส" })).toBeVisible();
  await expect(page.getByLabel("ค้นหาเจ้าของหรือสัตว์")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "สร้างลูกค้าใหม่" })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "เปิดเคส" })).toBeInViewport();
  await expect(page.getByLabel("น้ำหนัก (กก.)")).toBeInViewport();

  await page.getByRole("button", { name: "เปลี่ยนสัตว์" }).click();
  await expect(page.getByLabel("ค้นหาเจ้าของหรือสัตว์")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/bkk/pos");
  await page.getByPlaceholder("ค้นชื่อหรือเบอร์").fill("แพร");
  await page.getByRole("button", { name: /แพร/ }).first().click();
  const productSearch = page.getByLabel("ค้นสินค้า");
  await expect(productSearch).toBeVisible();
  await productSearch.fill("อาหาร");
  await expect(page.getByText("ค้นสินค้า", { exact: true })).toBeVisible();

  await page.goto("/bkk/grooming");
  const queue = page.getByText("ยังไม่มีคิววันนี้");
  const openQueue = page.getByRole("button", { name: "เปิดคิว" });
  await expect(queue).toBeVisible();
  await expect(openQueue).toBeVisible();
  const queueBox = await queue.boundingBox();
  const formBox = await openQueue.boundingBox();
  expect(queueBox).not.toBeNull();
  expect(formBox).not.toBeNull();
  expect(formBox!.x).toBeGreaterThan(queueBox!.x + queueBox!.width - 8);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(openQueue).toBeInViewport();
});

test("ห้องตรวจมีป้ายสัญญาณชีพค้างอยู่หลังกรอก", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, "nune@demo.local");
  await page.goto("/bkk/reception");
  await page.getByRole("button", { name: "สร้างลูกค้าใหม่" }).click();
  const stamp = Date.now().toString().slice(-6);
  await page.getByLabel("ชื่อเจ้าของ").fill(`ตรวจ${stamp}`);
  await page.getByLabel("เบอร์โทร").fill(`088${stamp}`);
  await page.getByLabel("ชื่อสัตว์").fill(`มอค${stamp}`);
  await page.getByRole("button", { name: "บันทึกลูกค้าแล้วไปชั่งน้ำหนัก" }).click();
  await expect(page.getByLabel("ค้นหาเจ้าของหรือสัตว์")).toHaveCount(0);
  await page.getByLabel("น้ำหนัก (กก.)").fill("3.4");
  await page.getByRole("button", { name: "เปิดเคส" }).click();
  await page.waitForURL(/\/bkk\/encounters\/[0-9a-f-]{36}/);
  const encounterUrl = page.url();

  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await page.waitForURL(/\/login/);
  await login(page, "ek@demo.local");
  await page.goto(encounterUrl);
  await page.setViewportSize({ width: 1280, height: 800 });
  const soapBox = await page.getByRole("textbox", { name: /อาการที่เจ้าของเล่า/ }).boundingBox();
  expect(soapBox?.width ?? 0).toBeGreaterThan(500);
  await page.setViewportSize({ width: 1440, height: 900 });
  const wideBox = await page.getByRole("textbox", { name: /อาการที่เจ้าของเล่า/ }).boundingBox();
  expect(wideBox?.width ?? 0).toBeGreaterThan(700);
  await page.goto("/bkk");
  await expect(page.getByRole("link", { name: /กรงที่ใช้อยู่/ })).toHaveClass(/bg-sky-50/);
  await page.goto("/bkk/boarding");
  await expect(page.getByText("แถบสีด้านบน — สีกรงที่ตั้งไว้ ไม่ใช่สถานะ")).toBeVisible();
  await page.goto(encounterUrl);
  await page.getByLabel("อุณหภูมิ องศาเซลเซียส").fill("38.6");
  await page.getByLabel("ชีพจร ครั้งต่อนาที").fill("120");
  await page.getByLabel("หายใจ ครั้งต่อนาที").fill("24");
  await expect(page.getByText("อุณหภูมิ (°C)")).toBeVisible();
  await expect(page.getByText("ชีพจร (ครั้ง/นาที)")).toBeVisible();
  await expect(page.getByText("หายใจ (ครั้ง/นาที)")).toBeVisible();
  const soapHint = page.getByText("กินได้ไหม อาเจียน ถ่าย เป็นมานานเท่าไร");
  await expect(soapHint).toBeVisible();
  const soapSize = await soapHint.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(soapSize).toBeGreaterThanOrEqual(13);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("อุณหภูมิ (°C)")).toBeVisible();
});
