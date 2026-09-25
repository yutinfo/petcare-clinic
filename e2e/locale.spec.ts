import { expect, test } from "@playwright/test";

test("สลับภาษาได้ที่หน้าเข้าสู่ระบบ หน้าหลัก และเคาน์เตอร์", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await page.getByRole("button", { name: "EN", pressed: false }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Email").fill("nune@demo.local");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/bkk(\/|$)/, { timeout: 30_000 });

  await expect(page.getByRole("link", { name: "Reception" }).first()).toBeVisible();
  await expect(page.getByText("Today at the clinic")).toBeVisible();
  await expect(page.getByRole("link", { name: /Kennels in use/ })).toBeVisible();

  await page.goto("/bkk/reception");
  await expect(page.getByRole("heading", { name: "Search, then open a visit" })).toBeVisible();
  await expect(page.getByLabel("Search owner or pet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Register a new client" })).toBeVisible();

  await page.getByRole("button", { name: "ไทย", pressed: false }).click();
  await expect(page.getByRole("heading", { name: "ค้นหาแล้วเปิดเคส" })).toBeVisible();
  await expect(page.getByRole("button", { name: "สร้างลูกค้าใหม่" })).toBeVisible();
});
