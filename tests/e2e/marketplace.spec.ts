import { test, expect } from "@playwright/test";
import { photo, registerAndVerify, sql, unique } from "./helpers";

test.describe.configure({ mode: "serial" });

test("browsing works without an account and shows honest empty states", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Okazionet nuk presin." })).toBeVisible();
  await page.goto("/kerko?q=asgjekundxyz");
  await expect(page.getByText(/Asnjë okazion për/)).toBeVisible();
  await page.goto("/paneli");
  await expect(page).toHaveURL(/\/hyr\?next=%2Fpaneli/);
});

test("full flow: register → draft → upload → submit → approve → public → contact → sold", async ({ browser, page }, testInfo) => {
  const title = `iPhone 13 Pro E2E ${testInfo.project.name} ${Date.now()}`;
  const sellerEmail = unique("seller");
  const adminEmail = unique("admin");

  // 1. Seller registers (email verification via outbox link).
  await registerAndVerify(page, "Ardit", sellerEmail);

  // 2–4. Draft with photos, then submit.
  await page.goto("/shit", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles([await photo(), await photo("#14231b")]);
  await expect(page.getByRole("img", { name: "Foto 2" })).toBeVisible();
  await page.getByLabel("Çfarë po shet?").fill(title);
  await page.getByLabel("Kategoria").selectOption({ label: "Telefona › iPhone" });
  await page.getByLabel("Qyteti").selectOption({ label: "Tiranë" });
  await page.getByLabel("Çmimi fiks (€)").fill("350");
  await page.getByLabel("Gjendja").selectOption({ label: "Shumë mirë" });
  await page.getByLabel("Përshkrimi").fill("Bateria 88%, pa gërvishtje, me kuti dhe kabllo origjinale.");
  await page.getByLabel("Numri i WhatsApp").fill("069 123 4567");
  await page.getByLabel(/Pranoj që blerësit/).check();
  await page.getByRole("button", { name: "Ruaj draft" }).click();
  await expect(page.getByText("Drafti u ruajt.")).toBeVisible();
  await page.getByRole("button", { name: "Vazhdo te parapamja" }).click();
  await page.waitForURL(/\/paneli\/njoftimet\/[^/]+$/);
  const listingId = page.url().split("/").pop()!;
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publiko" }).click();
  await expect(page.getByText(/U dërgua për shqyrtim/)).toBeVisible();

  // Not public while pending.
  const anon = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const buyer = await anon.newPage();
  await buyer.goto(`/kerko?q=${encodeURIComponent(title)}`);
  await expect(buyer.getByText(/Asnjë okazion për/)).toBeVisible();

  // 5. Admin approves.
  const adminCtx = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const admin = await adminCtx.newPage();
  await registerAndVerify(admin, "Admin", adminEmail);
  await sql(`UPDATE "user" SET role = 'ADMIN' WHERE email = $1`, [adminEmail]);
  await admin.goto("/admin/moderimi");
  const card = admin.locator("article", { hasText: title });
  await card.getByRole("button", { name: "Aprovo" }).click();
  await expect(card).toHaveCount(0);
  const [row] = await sql<{ status: string; published: Date; expires: Date }>(`SELECT status, "publishedAt" AS published, "expiresAt" AS expires FROM "Listing" WHERE id = $1`, [listingId]);
  expect(row!.status).toBe("ACTIVE");
  expect(new Date(row!.expires).getTime() - new Date(row!.published).getTime()).toBe(48 * 3_600_000);

  // 6–8. Public, countdown accurate, buyer opens it.
  await buyer.goto(`/kerko?q=${encodeURIComponent(title)}`);
  await buyer.getByRole("link", { name: title }).click();
  await buyer.waitForURL(/\/p\//);
  await expect(buyer.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(buyer.getByRole("timer")).toHaveText(/^47:5\d:\d\d$/);
  await expect(buyer.getByText("Çmim fiks", { exact: true }).first()).toBeVisible();

  // 9. Buyer contacts the seller → WhatsApp with a generated message (not a sale).
  await buyer.context().route(/https:\/\/(wa\.me|api\.whatsapp\.com)\/.*/, (r) => r.fulfill({ status: 200, body: "whatsapp" }));
  const [wa] = await Promise.all([buyer.waitForEvent("popup"), buyer.getByRole("button", { name: "Shkruaj në WhatsApp" }).click()]);
  await wa.waitForLoadState();
  expect(wa.url()).toContain("wa.me/355691234567");
  expect(decodeURIComponent(wa.url())).toContain(title);
  const [counts] = await sql<{ c: number; status: string }>(`SELECT "contactClickCount" AS c, status FROM "Listing" WHERE id = $1`, [listingId]);
  expect(counts!.c).toBe(1);
  expect(counts!.status).toBe("ACTIVE"); // a click is not a sale

  // 10. Seller marks it sold.
  await page.goto(`/paneli/njoftimet/${listingId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Shëno si të shitur" }).click();
  await expect(page.getByText("Shitur", { exact: true }).first()).toBeVisible();

  // 11. Gone from active discovery; the page shows the sold state, contact is impossible.
  await buyer.goto(`/kerko?q=${encodeURIComponent(title)}`);
  await expect(buyer.getByText(/Asnjë okazion për/)).toBeVisible();
  await buyer.goto(`/p/${(await sql<{ slug: string }>(`SELECT slug FROM "Listing" WHERE id = $1`, [listingId]))[0]!.slug}`);
  await expect(buyer.getByText("Ky produkt është shitur.")).toBeVisible();
  await expect(buyer.getByRole("button", { name: "Shkruaj në WhatsApp" })).toHaveCount(0);
  const direct = await buyer.request.post(`/api/contact/${listingId}`, { headers: { origin: new URL(buyer.url()).origin }, maxRedirects: 0 });
  expect(direct.status()).toBe(303);
  expect(direct.headers()["location"]).not.toContain("wa.me");

  await anon.close();
  await adminCtx.close();
});

test("natural expiry: excluded from discovery and contact without waiting 48h", async ({ page }, testInfo) => {
  const email = unique("trusted");
  const title = `PS5 Slim expiry ${testInfo.project.name} ${Date.now()}`;
  await registerAndVerify(page, "Klajdi", email);
  await sql(`UPDATE "user" SET trusted = true, whatsapp = '355691112223', "contactConsent" = true WHERE email = $1`, [email]);
  await page.goto("/shit", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles([await photo()]);
  await expect(page.getByRole("img", { name: "Foto 1" })).toBeVisible();
  await page.getByLabel("Çfarë po shet?").fill(title);
  await page.getByLabel("Kategoria").selectOption({ label: "Gaming › Konsola" });
  await page.getByLabel("Qyteti").selectOption({ label: "Durrës" });
  await page.getByLabel("Çmimi fiks (€)").fill("279");
  await page.getByLabel("Gjendja").selectOption({ label: "Si i ri" });
  await page.getByLabel("Përshkrimi").fill("Me një kontroller dhe kutinë origjinale, punon pa asnjë problem.");
  await page.getByRole("button", { name: "Vazhdo te parapamja" }).click();
  await page.waitForURL(/\/paneli\/njoftimet\/[^/]+$/);
  const id = page.url().split("/").pop()!;
  await page.getByRole("button", { name: "Publiko" }).click();
  await expect(page.getByText(/Okazioni është live/)).toBeVisible();

  await page.goto(`/kerko?q=${encodeURIComponent(title)}`);
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  // Controlled clock: move the server-side deadline into the past (worker hasn't run: status still ACTIVE).
  await sql(`UPDATE "Listing" SET "publishedAt" = now() - interval '49 hours', "expiresAt" = now() - interval '1 hour' WHERE id = $1`, [id]);
  await page.goto(`/kerko?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(/Asnjë okazion për/)).toBeVisible();
  await page.goto(`/paneli/njoftimet/${id}`);
  await expect(page.getByText("Skadoi", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Shëno si të shitur" })).toHaveCount(0);
  const r = await page.request.post(`/api/contact/${id}`, { headers: { origin: new URL(page.url()).origin }, maxRedirects: 0 });
  expect(r.headers()["location"]).not.toContain("wa.me");
});

test("cross-site POSTs and anonymous uploads are refused", async ({ request }) => {
  const evil = await request.post("/api/contact/anything", { headers: { origin: "https://evil.example" }, maxRedirects: 0 });
  expect(evil.status()).toBe(403);
  const upload = await request.post("/api/uploads", { headers: { origin: "http://localhost:3100" }, multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } } });
  expect(upload.status()).toBe(401);
});
