import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const PROJECT = "demo-dinexes";
export const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
export const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
/** A tiny valid PNG for upload tests. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/** Signs in through the Auth emulator and returns an ID token (used to call the API as that user). */
export async function idToken(request: APIRequestContext, email: string, password: string): Promise<{ token: string; uid: string }> {
  const r = await request.post(`${AUTH}/accounts:signInWithPassword?key=demo-key`, { data: { email, password, returnSecureToken: true } });
  expect(r.ok(), await r.text()).toBeTruthy();
  const j = await r.json();
  return { token: j.idToken, uid: j.localId };
}

/** Reads a Firestore document from the emulator as admin (bypasses rules; test set-up only). */
export async function adminGet(request: APIRequestContext, path: string) {
  const r = await request.get(`${FS}/${path}`, { headers: { Authorization: "Bearer owner" } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()).fields as Record<string, { stringValue?: string; integerValue?: string }>;
}

export async function adminPatchInt(request: APIRequestContext, path: string, field: string, value: number) {
  const r = await request.patch(`${FS}/${path}?updateMask.fieldPaths=${field}`, {
    headers: { Authorization: "Bearer owner" },
    data: { fields: { [field]: { integerValue: String(value) } } },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}

/** Sets plan fields on a restaurant (test set-up only): the tier and when the paid period ends. */
export async function adminSetPlan(request: APIRequestContext, rid: string, tier: "pro" | "premium", periodEnd: number) {
  const r = await request.patch(`${FS}/restaurants/${rid}?updateMask.fieldPaths=planTier&updateMask.fieldPaths=subscription`, {
    headers: { Authorization: "Bearer owner" },
    data: {
      fields: {
        planTier: { stringValue: tier },
        subscription: { mapValue: { fields: { status: { stringValue: "active" }, currentPeriodEnd: { integerValue: String(periodEnd) } } } },
      },
    },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}

/** Opens the email-verification link the Auth emulator "sent". */
export async function verifyEmail(request: APIRequestContext, email: string) {
  await expect
    .poll(async () => {
      const r = await request.get(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`);
      const codes = ((await r.json()).oobCodes || []) as { email: string; requestType: string; oobLink: string }[];
      return codes.filter((c) => c.email === email && c.requestType === "VERIFY_EMAIL").length;
    })
    .toBeGreaterThan(0);
  const r = await request.get(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`);
  const codes = ((await r.json()).oobCodes || []) as { email: string; requestType: string; oobLink: string }[];
  const link = codes.filter((c) => c.email === email && c.requestType === "VERIFY_EMAIL").pop()!.oobLink;
  expect((await request.get(link)).ok()).toBeTruthy();
}

export async function register(page: Page, o: { name: string; email: string; password: string; restaurant: string; phone: string; city: string }) {
  await page.goto("/register");
  await page.getByLabel("Your name").fill(o.name);
  await page.getByLabel("Email", { exact: true }).fill(o.email);
  await page.getByLabel("Password", { exact: true }).fill(o.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Verify your email")).toBeVisible();
  // Before verifying, the server refuses to create a restaurant.
  await verifyEmail(page.request, o.email);
  await page.getByRole("button", { name: "I have verified my email" }).click();
  await page.getByLabel("Restaurant name").fill(o.restaurant);
  await page.getByLabel("Phone").fill(o.phone);
  await page.getByLabel("City").fill(o.city);
  await page.getByRole("button", { name: /Start 7-day free trial/ }).click();
  await page.waitForURL("**/onboarding");
}

export async function addDish(page: Page, category: string, name: string, price: string, photo = false) {
  await page.getByTestId(`category-${category}`).getByRole("button", { name: "Add dish" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Dish name").fill(name);
  await dlg.getByLabel("Price (₹)").fill(price);
  if (photo) {
    await dlg.getByTestId("upload-dish").setInputFiles({ name: "dish.png", mimeType: "image/png", buffer: PNG });
    await expect(dlg.getByRole("button", { name: "Remove" })).toBeVisible();
  }
  await dlg.getByRole("button", { name: "Add dish" }).click();
  await expect(page.getByTestId(`dish-${name}`)).toBeVisible();
}

export async function addCategory(page: Page, name: string) {
  await page.getByLabel("New category name").fill(name);
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByTestId(`category-${name}`)).toBeVisible();
}
