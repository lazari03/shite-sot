import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import sharp from "sharp";
import { expect, type Page } from "@playwright/test";
import { E2E_DB, E2E_STORAGE } from "../../playwright.config";

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: E2E_DB });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

/** Reads the dev outbox written by the console email provider. */
export async function lastLinkFor(email: string, contains: string): Promise<string> {
  const file = path.resolve(E2E_STORAGE, "outbox.jsonl");
  for (let i = 0; i < 40; i++) {
    if (existsSync(file)) {
      const mails = readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { to: string; text: string });
      const mail = mails.reverse().find((m) => m.to === email && m.text.includes(contains));
      const url = mail?.text.match(/https?:\/\/\S+/)?.[0];
      if (url) return url;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email for ${email}`);
}

export const unique = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@e2e.invalid`;

export async function photo(color = "#5f8a00"): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  return { name: "photo.jpg", mimeType: "image/jpeg", buffer: await sharp({ create: { width: 1200, height: 900, channels: 3, background: color } }).jpeg().toBuffer() };
}

/** Register via the UI, confirm through the emailed link, end up logged in. */
export async function registerAndVerify(page: Page, name: string, email: string, password = "korrekt-kali-123") {
  await page.goto("/regjistrohu", { waitUntil: "networkidle" });
  await page.getByLabel("Emri që shohin blerësit").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Fjalëkalimi").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Regjistrohu" }).click();
  await expect(page.getByText("Kontrollo email-in")).toBeVisible();
  const link = await lastLinkFor(email, "verify-email");
  await page.goto(link);
  await page.waitForURL(/\/paneli/);
}

export async function login(page: Page, email: string, password = "korrekt-kali-123") {
  await page.goto("/hyr", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Fjalëkalimi").fill(password);
  await page.getByRole("button", { name: "Hyr", exact: true }).click();
  await page.waitForURL(/\/paneli/);
}
