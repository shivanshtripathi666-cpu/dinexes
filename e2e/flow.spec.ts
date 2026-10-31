import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { FS, PNG, addCategory, addDish, adminGet, adminPatchInt, idToken, register } from "./helpers";

/**
 * The complete flow from the product brief, against the Firebase emulators (real Auth, real
 * Firestore security rules, real Storage) and the production build of the app.
 */
test.describe.configure({ mode: "serial" });

const run = Date.now();
const A = { name: "Asha Verma", email: `owner-a-${run}@example.com`, password: "Passw0rd-a1", restaurant: "Royal Biryani House", phone: "9876543210", city: "Prayagraj" };
const B = { name: "Bharat Singh", email: `owner-b-${run}@example.com`, password: "Passw0rd-b1", restaurant: "Second Cafe", phone: "9876500000", city: "Lucknow" };

let owner: BrowserContext;
let ownerPage: Page;
let kitchenPage: Page;
let counterPage: Page;
let guest: BrowserContext;
let guestPage: Page;
let seat2Url = "";
let orderUrl = "";
let orderNo = 0;

test.afterAll(async () => {
  await owner?.close();
  await guest?.close();
});

test("1-2. owner registers a restaurant and creates the menu", async ({ browser }) => {
  owner = await browser.newContext();
  ownerPage = await owner.newPage();
  const p = ownerPage;
  await register(p, A);

  await expect(p.getByRole("heading", { name: "Details" })).toBeVisible();
  await p.getByRole("button", { name: "Save and continue" }).click();

  await expect(p.getByRole("heading", { name: "Logo & cover" })).toBeVisible();
  await p.getByTestId("upload-logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(p.getByRole("button", { name: "Remove" })).toBeVisible();
  await p.getByRole("button", { name: "Save and continue" }).click();

  await expect(p.getByRole("heading", { name: "Opening hours" })).toBeVisible();
  await p.getByRole("button", { name: "Save and continue" }).click();

  // 3. Ten seats
  await expect(p.getByRole("heading", { name: "Seats" })).toBeVisible();
  await p.getByLabel("Number of seats to add").fill("10");
  await p.getByRole("button", { name: "Add seats" }).click();
  await expect(p.getByText("10 seats created.")).toBeVisible();
  await p.getByRole("button", { name: "Continue" }).click();

  await expect(p.getByRole("heading", { name: "Menu" })).toBeVisible();
  await addCategory(p, "Main course");
  await addCategory(p, "Drinks");
  await addDish(p, "Main course", "Chicken Biryani", "180", true);
  await addDish(p, "Main course", "Raita", "40");
  await addDish(p, "Drinks", "Cold Coffee", "90");
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByRole("button", { name: "Open dashboard" }).click();
  await p.waitForURL("**/dashboard");
  await expect(p.getByText("Orders today")).toBeVisible();
  await expect(p.getByText("No sales yet")).toBeVisible();
});

test("4. QR codes exist for all 10 seats", async () => {
  const p = ownerPage;
  await p.goto("/dashboard/qr");
  await expect(p.locator('[data-testid^="seat-card-"]')).toHaveCount(10);
  await expect(p.getByTestId("seat-card-2").getByRole("img", { name: "QR code" }).locator("svg")).toBeVisible();
  seat2Url = (await p.getByTestId("seat-card-2").getAttribute("data-seat-url")) || "";
  expect(seat2Url).toMatch(/\/t\/[A-Za-z0-9]{22}$/);
});

test("5-9. guest at Seat 2 orders; kitchen hears it; counter sees it", async ({ browser }) => {
  kitchenPage = await owner.newPage();
  await kitchenPage.goto("/dashboard/kitchen");
  await kitchenPage.getByTestId("start-kitchen").click();
  await expect(kitchenPage.getByText("Kitchen mode on")).toBeVisible();

  guest = await browser.newContext({ ...devices["Pixel 7"] });
  guestPage = await guest.newPage();
  const g = guestPage;
  await g.goto(seat2Url);
  await expect(g.getByTestId("seat-label")).toHaveText("Seat 2");
  await expect(g.getByRole("heading", { name: A.restaurant })).toBeVisible();
  const noOverflow = await g.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(noOverflow, "menu fits the phone screen").toBeTruthy();

  await g.getByRole("button", { name: "Add Chicken Biryani" }).click();
  await g.getByRole("button", { name: "Add Cold Coffee" }).click();
  await g.getByRole("button", { name: "Add one more Cold Coffee" }).click();
  await g.getByTestId("view-cart").click();
  await expect(g.getByTestId("cart-total")).toHaveText("₹360");
  await g.getByRole("button", { name: "Place order" }).click();
  await g.waitForURL("**/o/**");
  orderUrl = g.url();
  await expect(g.getByTestId("order-status")).toHaveText("New");
  orderNo = Number((await g.getByRole("heading", { name: /Order #\d+/ }).textContent())!.replace(/\D/g, ""));
  expect(orderNo).toBeGreaterThan(100);
  const fits = await g.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(fits, "confirmation fits the phone screen").toBeTruthy();

  // 7. kitchen
  const ticket = kitchenPage.getByTestId(`ticket-${orderNo}`);
  await expect(ticket).toBeVisible();
  await expect(ticket.getByTestId("ticket-seat")).toHaveText("Seat 2");
  await expect(ticket).toContainText("Chicken Biryani");
  await expect(ticket).toContainText("× 2");
  await expect(kitchenPage.getByTestId("new-order-banner")).toContainText(`New order #${orderNo}`);

  // 9. voice announcement was produced and handed to the speech engine
  await expect
    .poll(async () => kitchenPage.evaluate(() => (window.__dxSpoken || []).join(" | ")), { timeout: 20_000 })
    .toContain(`New order. Seat number 2. one Chicken Biryani and two Cold Coffee. Order number ${orderNo}.`);

  // 8. counter
  counterPage = await owner.newPage();
  await counterPage.goto("/dashboard/counter");
  const row = counterPage.getByTestId(`counter-order-${orderNo}`);
  await expect(row).toContainText("Seat 2");
  await expect(row.getByTestId("counter-total")).toHaveText("₹360");
  await expect(row).toContainText("Unpaid");
});

test("10-11. status changes reach the guest live", async () => {
  const ticket = kitchenPage.getByTestId(`ticket-${orderNo}`);
  await ticket.getByRole("button", { name: "Accept" }).click();
  await expect(guestPage.getByTestId("order-status")).toHaveText("Accepted");
  await ticket.getByRole("button", { name: "Start preparing" }).click();
  await expect(guestPage.getByTestId("order-status")).toHaveText("Preparing");
  await ticket.getByRole("button", { name: "Mark ready" }).click();
  await expect(guestPage.getByTestId("order-status")).toHaveText("Ready");

  const row = counterPage.getByTestId(`counter-order-${orderNo}`);
  await expect(row).toContainText("Ready");
  await row.getByRole("button", { name: "Mark served" }).click();
  await row.getByRole("button", { name: "Paid cash" }).click();
  await expect(row).toContainText("Paid · CASH");
  await expect(guestPage.getByTestId("order-status")).toHaveText("Served");

  // Guest orders again from the same seat: a separate order and ticket.
  await guestPage.getByRole("link", { name: "Order more from this seat" }).click();
  await guestPage.getByRole("button", { name: "Add Raita" }).click();
  await guestPage.getByTestId("view-cart").click();
  await guestPage.getByRole("button", { name: "Place order" }).click();
  await guestPage.waitForURL((u) => u.pathname.startsWith("/o/") && u.href !== orderUrl);
  const second = Number((await guestPage.getByRole("heading", { name: /Order #\d+/ }).textContent())!.replace(/\D/g, ""));
  expect(second).toBe(orderNo + 1);
  await expect(kitchenPage.getByTestId(`ticket-${second}`)).toContainText("Raita");
});

test("server sets prices and ignores repeated submissions", async ({ request }) => {
  const seatToken = seat2Url.split("/t/")[1];
  const status = await adminGet(request, `orderStatus/${orderUrl.split("/o/")[1]}`);
  const rid = status.rid.stringValue!;
  const dishes = await request.get(`${FS}/restaurants/${rid}/dishes`, { headers: { Authorization: "Bearer owner" } });
  const list = (await dishes.json()).documents as { name: string; fields: { name: { stringValue: string } } }[];
  const biryani = list.find((d) => d.fields.name.stringValue === "Chicken Biryani")!.name.split("/").pop();
  const body = { seatToken, idempotencyKey: `test-key-${run}-abcdef`, note: "", items: [{ dishId: biryani, qty: 1, price: 1, unitPaise: 1 }], totalPaise: 1 };
  const r1 = await request.post("/api/orders", { data: body });
  expect(r1.status()).toBe(201);
  const r2 = await request.post("/api/orders", { data: body });
  expect(r2.status()).toBe(200);
  const j1 = await r1.json();
  const j2 = await r2.json();
  expect(j2.number).toBe(j1.number);
  expect(j2.created).toBe(false);
  const s = await adminGet(request, `orderStatus/${j1.publicToken}`);
  expect(s.totalPaise.integerValue).toBe("18000");

  const bad = await request.post("/api/orders", { data: { ...body, seatToken: "AAAAAAAAAAAAAAAAAAAAAA", idempotencyKey: `test-key-${run}-zzzzzz` } });
  expect(bad.status()).toBe(404);
});

test("12. another restaurant cannot see or change this order", async ({ browser, request }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await register(p, B);
  const status = await adminGet(request, `orderStatus/${orderUrl.split("/o/")[1]}`);
  const ridA = status.rid.stringValue!;
  const oidA = status.oid.stringValue!;

  const b = await idToken(request, B.email, B.password);
  const a = await idToken(request, A.email, A.password);

  // API: B's login cannot change A's order.
  const change = await request.patch(`/api/orders/${oidA}`, { headers: { Authorization: `Bearer ${b.token}` }, data: { status: "cancelled" } });
  expect(change.status()).toBe(404);

  // Database rules: B cannot read A's order; A can.
  const readB = await request.get(`${FS}/restaurants/${ridA}/orders/${oidA}`, { headers: { Authorization: `Bearer ${b.token}` } });
  expect(readB.status()).toBe(403);
  const readA = await request.get(`${FS}/restaurants/${ridA}/orders/${oidA}`, { headers: { Authorization: `Bearer ${a.token}` } });
  expect(readA.status()).toBe(200);
  // A guest (no login) cannot list orders either.
  const anon = await request.get(`${FS}/restaurants/${ridA}/orders`);
  expect(anon.status()).toBe(403);

  // 15b. Expired trial: B's guests cannot order.
  const userB = await adminGet(request, `users/${b.uid}`);
  const ridB = userB.rid.stringValue!;
  const auth = { Authorization: `Bearer ${b.token}` };
  expect((await request.post("/api/seats", { headers: auth, data: { count: 1 } })).status()).toBe(201);
  const cat = await (await request.post("/api/menu/categories", { headers: auth, data: { name: "Tea" } })).json();
  const dish = await (await request.post("/api/menu/dishes", { headers: auth, data: { categoryId: cat.id, name: "Masala Chai", price: "20" } })).json();
  const seats = await request.get(`${FS}/restaurants/${ridB}/seats`, { headers: { Authorization: "Bearer owner" } });
  const seatTokenB = (await seats.json()).documents[0].fields.token.stringValue;
  const okOrder = await request.post("/api/orders", { data: { seatToken: seatTokenB, idempotencyKey: `b-ok-${run}-abcdefgh`, note: "", items: [{ dishId: dish.id, qty: 1 }] } });
  expect(okOrder.status()).toBe(201);
  await adminPatchInt(request, `restaurants/${ridB}`, "trialEndsAt", Date.now() - 1000);
  const blocked = await request.post("/api/orders", { data: { seatToken: seatTokenB, idempotencyKey: `b-no-${run}-abcdefgh`, note: "", items: [{ dishId: dish.id, qty: 1 }] } });
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).code).toBe("not_accepting");
  await p.goto("/onboarding");
  await p.getByRole("button", { name: "Finish" }).click();
  await p.getByRole("button", { name: "Open dashboard" }).click();
  await p.waitForURL("**/dashboard");
  await expect(p.getByText("Your subscription has ended")).toBeVisible();
  await p.goto("/dashboard/billing");
  await expect(p.getByTestId("billing-status")).toHaveText("Expired");
  await ctx.close();
});

test("13-14. four staff logins allowed, the fifth is refused", async ({ request, browser }) => {
  const p = ownerPage;
  await p.goto("/dashboard/staff");
  await expect(p.getByText("1 of 4 logins used")).toBeVisible();
  const staff = [
    { name: "Manoj Manager", role: "Manager", email: `manager-${run}@example.com` },
    { name: "Chetan Cashier", role: "Cashier", email: `cashier-${run}@example.com` },
    { name: "Kiran Kitchen", role: "Kitchen", email: `kitchen-${run}@example.com` },
  ];
  for (const s of staff) {
    await p.getByTestId("add-staff").click();
    const dlg = p.getByRole("dialog");
    await dlg.getByLabel("Name").fill(s.name);
    await dlg.getByLabel("Email").fill(s.email);
    await dlg.getByLabel("Role").selectOption({ label: s.role });
    await dlg.getByLabel("Temporary password").fill("Temp12345");
    await dlg.getByRole("button", { name: "Add login" }).click();
    await expect(p.getByTestId(`member-${s.email}`)).toBeVisible();
  }
  await expect(p.getByText("4 of 4 logins used")).toBeVisible();
  await expect(p.getByTestId("add-staff")).toBeDisabled();

  const a = await idToken(request, A.email, A.password);
  const fifth = await request.post("/api/staff", {
    headers: { Authorization: `Bearer ${a.token}` },
    data: { name: "Fifth Person", email: `fifth-${run}@example.com`, role: "cashier", password: "Temp12345" },
  });
  expect(fifth.status()).toBe(409);
  expect((await fifth.json()).code).toBe("limit");

  // The kitchen login sees the same restaurant's kitchen, and nothing it is not allowed to.
  const kctx = await browser.newContext();
  const k = await kctx.newPage();
  await k.goto("/login");
  await k.getByLabel("Email").fill(staff[2].email);
  await k.getByLabel("Password").fill("Temp12345");
  await k.getByRole("button", { name: "Sign in" }).click();
  await k.waitForURL("**/dashboard/kitchen");
  await expect(k.getByTestId(`ticket-${orderNo + 1}`)).toBeVisible();
  await k.goto("/dashboard/staff");
  await expect(k.getByText("Not available for your role")).toBeVisible();
  const kt = await idToken(request, staff[2].email, "Temp12345");
  const forbidden = await request.post("/api/menu/categories", { headers: { Authorization: `Bearer ${kt.token}` }, data: { name: "Hack" } });
  expect(forbidden.status()).toBe(403);

  // Owner removes the kitchen login: access stops immediately.
  await p.getByTestId(`member-${staff[2].email}`).getByRole("button", { name: "Remove access" }).click();
  await expect(p.getByTestId(`member-${staff[2].email}`)).toHaveCount(0);
  const after = await request.patch(`/api/orders/abcdefghij`, { headers: { Authorization: `Bearer ${kt.token}` }, data: { status: "accepted" } });
  expect([401, 403]).toContain(after.status());
  await kctx.close();
});

test("15-16. trial status and the ₹399 plan", async ({ page }) => {
  const p = ownerPage;
  await p.goto("/dashboard/billing");
  await expect(p.getByTestId("billing-status")).toHaveText("Free trial");
  await expect(p.getByTestId("billing-detail")).toContainText("7 days left");
  await expect(p.getByTestId("billing-price")).toHaveText("₹399");
  await expect(p.getByTestId("payments-placeholder")).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByTestId("plan-price")).toHaveText("₹399");
});

test("17. owner pages work on a phone", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const p = await ctx.newPage();
  await p.goto("/login");
  await p.getByLabel("Email").fill(A.email);
  await p.getByLabel("Password").fill(A.password);
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.waitForURL("**/dashboard");
  for (const path of ["/dashboard", "/dashboard/kitchen", "/dashboard/counter", "/dashboard/menu", "/dashboard/qr", "/dashboard/staff", "/dashboard/billing", "/dashboard/settings", "/dashboard/reports"]) {
    await p.goto(path);
    await expect(p.locator("main h1").first()).toBeVisible();
    const fits = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(fits, `${path} fits the phone screen`).toBeTruthy();
  }
  for (const path of ["/", "/pricing", "/register"]) {
    await p.goto(path);
    const fits = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(fits, `${path} fits the phone screen`).toBeTruthy();
  }
  await ctx.close();
});
