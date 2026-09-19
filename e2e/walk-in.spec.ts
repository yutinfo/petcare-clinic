import { expect, test } from "@playwright/test";

test("เปิดเคส walk-in ลูกค้าใหม่ได้ในหน้าเดียว", async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);
  const ownerName = `ทดสอบ${stamp}`;
  const petName = `ม็อก${stamp}`;
  const phone = `089${stamp}0`;

  await page.goto("/login");
  await page.getByLabel("อีเมล").fill("nune@demo.local");
  await page.getByLabel("รหัสผ่าน").fill("demo1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/bkk(\/|$)/, { timeout: 30_000 });

  await page.goto("/bkk/reception");
  await expect(page.getByRole("heading", { name: "ค้นหาแล้วเปิดเคส" })).toBeVisible();

  const started = Date.now();
  await page.getByRole("button", { name: "สร้างลูกค้าใหม่" }).click();
  await page.getByLabel("ชื่อเจ้าของ").fill(ownerName);
  await page.getByLabel("เบอร์โทร").fill(phone);
  await page.getByLabel("ชื่อสัตว์").fill(petName);
  await page.getByRole("button", { name: "บันทึกลูกค้าแล้วไปชั่งน้ำหนัก" }).click();

  await expect(page.getByRole("heading", { name: `${petName} · ${ownerName}` })).toBeVisible();
  await page.getByLabel("น้ำหนัก (กก.)").fill("4.2");
  await page.getByLabel("อาการเบื้องต้น").fill("อาเจียน 1 วัน");
  await page.getByRole("button", { name: "เปิดเคส" }).click();

  await page.waitForURL(/\/bkk\/encounters\/[0-9a-f-]{36}/, { timeout: 30_000 });
  const elapsedMs = Date.now() - started;
  await expect(page.getByRole("heading", { name: petName })).toBeVisible();
  await expect(page.getByText(/VN-BKK-\d{4}-\d{6}/)).toBeVisible();
  await expect(page.getByText("4.2")).toBeVisible();
  expect(elapsedMs, `walk-in ใช้เวลา ${elapsedMs}ms เกิน 60 วินาที`).toBeLessThan(60_000);
});
