import { expect, test } from "@playwright/test";

test("เจ้าของสัตว์สลับภาษาที่หน้าเข้าพอร์ทัลได้", async ({ page }) => {
  await page.goto("/portal/login");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบด้วยเบอร์โทร" })).toBeVisible();
  await page.getByRole("button", { name: "EN", pressed: false }).click();
  await expect(page.getByRole("heading", { name: "Sign in with your phone" })).toBeVisible();
  await expect(page.getByLabel("Phone")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send code" })).toBeVisible();
  await page.getByRole("button", { name: "ไทย", pressed: false }).click();
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบด้วยเบอร์โทร" })).toBeVisible();
});
