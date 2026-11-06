import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { AUTH, FS, PNG, addCategory, addDish, adminGet, adminPatchInt, adminSetPlan, idToken, register } from "./helpers";

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

  // 3. Ten dining seats (the trial includes every QR type)
  await expect(p.getByRole("heading", { name: "QR codes" })).toBeVisible();
  await expect(p.getByText("Stall / counter", { exact: true })).toBeVisible();
  await p.getByLabel("Number of dining seats QR codes to add").fill("10");
  await p.getByTestId("add-qr-dine").click();
  await expect(p.getByText("10 QR codes created.")).toBeVisible();
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
  await expect(p.getByTestId("your-plan")).toContainText("ACTIVE");
  await expect(p.getByTestId("choose-premium")).toContainText("₹349");
  await expect(p.getByTestId("choose-pro")).toContainText("₹249");
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
  await expect(ticket.getByRole("button", { name: "Start preparing" })).toHaveCount(0);
  await ticket.getByRole("button", { name: "Mark ready" }).click();
  await expect(guestPage.getByTestId("order-status")).toHaveText("Ready");

  const row = counterPage.getByTestId(`counter-order-${orderNo}`);
  await expect(row).toContainText("Ready");
  await row.getByRole("button", { name: "Mark served" }).click();
  await row.getByRole("button", { name: "Paid cash" }).click();
  await expect(row).toContainText("Paid · CASH");
  await expect(guestPage.getByTestId("order-status")).toHaveText("Served");

  // The guest rates the food; the stars appear on the menu.
  await expect(guestPage.getByTestId("rate-food")).toBeVisible();
  await guestPage.getByRole("radio", { name: "5 stars for Chicken Biryani" }).click();
  await guestPage.getByRole("radio", { name: "4 stars for Cold Coffee" }).click();
  await guestPage.getByRole("button", { name: "Submit rating" }).click();
  await expect(guestPage.getByTestId("rated")).toBeVisible();

  // Guest orders again from the same seat: a separate order and ticket.
  await guestPage.getByRole("link", { name: "Order more from this seat" }).click();
  await expect(guestPage.getByLabel("Rated 5 out of 5 by 1 guests")).toBeVisible();
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

  // An account whose email is not verified cannot create a restaurant (no free-trial farming).
  const su = await request.post(`${AUTH}/accounts:signUp?key=demo-key`, { data: { email: `unverified-${run}@example.com`, password: "Passw0rd-x1", returnSecureToken: true } });
  const unverified = (await su.json()).idToken;
  const blockedReg = await request.post("/api/restaurants", { headers: { Authorization: `Bearer ${unverified}` }, data: { name: "Fake Cafe", ownerName: "X Y", phone: "9876512345", city: "Delhi" } });
  expect(blockedReg.status()).toBe(403);

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

  // Pro plan: only stall / counter QR codes. The old dining seat stops taking orders; a counter QR works and needs a name.
  await adminSetPlan(request, ridB, "pro", Date.now() + 30 * 86400000);
  const dineNow = await request.post("/api/orders", { data: { seatToken: seatTokenB, idempotencyKey: `b-dine-${run}-abcdefgh`, note: "", items: [{ dishId: dish.id, qty: 1 }] } });
  expect(dineNow.status()).toBe(403);
  const addDine = await request.post("/api/seats", { headers: auth, data: { count: 1, kind: "dine" } });
  expect(addDine.status()).toBe(403);
  expect((await addDine.json()).code).toBe("not_in_plan");
  expect((await request.post("/api/seats", { headers: auth, data: { count: 1, kind: "takeaway" } })).status()).toBe(403);
  expect((await request.post("/api/seats", { headers: auth, data: { count: 1, kind: "counter" } })).status()).toBe(201);
  const all = await (await request.get(`${FS}/restaurants/${ridB}/seats`, { headers: { Authorization: "Bearer owner" } })).json();
  const counter = (all.documents as { fields: Record<string, { stringValue?: string }> }[]).find((x) => x.fields.kind?.stringValue === "counter")!;
  expect(counter.fields.label.stringValue).toBe("Counter 1");
  const ct = counter.fields.token.stringValue;
  const noName = await request.post("/api/orders", { data: { seatToken: ct, idempotencyKey: `b-c0-${run}-abcdefgh`, note: "", items: [{ dishId: dish.id, qty: 1 }] } });
  expect(noName.status()).toBe(400);
  expect((await noName.json()).code).toBe("name_required");
  const junkName = await request.post("/api/orders", { data: { seatToken: ct, customerName: "1234 <>!", idempotencyKey: `b-c1-${run}-abcdefgh`, note: "", items: [{ dishId: dish.id, qty: 1 }] } });
  expect(junkName.status()).toBe(400);
  const named = await request.post("/api/orders", { data: { seatToken: ct, customerName: "  Ravi <script>  ", idempotencyKey: `b-c2-${run}-abcdefgh`, note: "", items: [{ dishId: dish.id, qty: 2 }] } });
  expect(named.status()).toBe(201);
  const st = await adminGet(request, `orderStatus/${(await named.json()).publicToken}`);
  expect(st.customerName.stringValue).toBe("Ravi script");
  expect(st.kind.stringValue).toBe("counter");
  await p.goto("/dashboard/qr");
  await expect(p.getByTestId("qr-upgrade")).toBeVisible();
  await ctx.close();
});

test("stall QR: guest writes a name, sees the bill, the kitchen hears the name and calls it when ready", async ({ browser }) => {
  const p = ownerPage;
  await p.goto("/dashboard/qr");
  await p.getByTestId("qr-tab-counter").click();
  await p.getByTestId("add-qr-counter").click();
  const card = p.locator('[data-qr-kind="counter"]').first();
  await expect(card).toBeVisible();
  const url = (await card.getAttribute("data-seat-url")) || "";
  expect(url).toMatch(/\/t\/[A-Za-z0-9]{22}$/);

  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const g = await ctx.newPage();
  await g.goto(url);
  await expect(g.getByTestId("seat-label")).toHaveText("Counter 1");
  await g.getByRole("button", { name: "Add Cold Coffee" }).click();
  await g.getByTestId("view-cart").click();
  await expect(g.getByRole("dialog")).toContainText("Your bill");
  await expect(g.getByTestId("cart-total")).toHaveText("₹90");
  await g.getByTestId("place-order").click();
  await expect(g.getByText("Please write your name.")).toBeVisible();
  await g.getByTestId("guest-name").fill("Shivansh");
  await expect(g.getByTestId("place-order")).toHaveText("Confirm and order · ₹90");
  await g.getByTestId("place-order").click();
  await g.waitForURL("**/o/**");
  await expect(g.getByTestId("order-name")).toHaveText("Shivansh");
  await expect(g.getByTestId("pickup-box")).toContainText("We will call your name");
  const n = Number((await g.getByRole("heading", { name: /Order #\d+/ }).textContent())!.replace(/\D/g, ""));

  const ticket = kitchenPage.getByTestId(`ticket-${n}`);
  await expect(ticket.getByTestId("ticket-seat")).toHaveText("Shivansh");
  await expect(ticket.getByTestId("ticket-kind")).toContainText("Counter 1");
  await expect
    .poll(async () => kitchenPage.evaluate(() => (window.__dxSpoken || []).join(" | ")), { timeout: 20_000 })
    .toContain(`Shivansh. one Cold Coffee. Order number ${n}.`);

  await ticket.getByRole("button", { name: "Accept" }).click();
  await ticket.getByRole("button", { name: "Mark ready" }).click();
  await expect(g.getByTestId("pickup-box")).toContainText("Ready! Please collect");
  await expect
    .poll(async () => kitchenPage.evaluate(() => (window.__dxSpoken || []).join(" | ")), { timeout: 20_000 })
    .toContain(`Shivansh, your order is ready. Order number ${n}.`);
  await counterPage.reload();
  await expect(counterPage.getByTestId(`counter-order-${n}`)).toContainText("Shivansh");

  // The name is remembered on this phone for the next order.
  await g.goto(url);
  await g.getByRole("button", { name: "Add Raita" }).click();
  await g.getByTestId("view-cart").click();
  await expect(g.getByTestId("guest-name")).toHaveValue("Shivansh");
  await ctx.close();
});

test("13-14. owner adds 3 staff (4 logins), the fifth is refused; staff log in, passwords, removal", async ({ request, browser }) => {
  const p = ownerPage;
  await p.goto("/dashboard/staff");
  await expect(p.getByText("1 of 4 logins used")).toBeVisible();
  const staff = [
    { name: "Manoj Manager", duty: /^Manager/, email: `manager-${run}@example.com` },
    { name: "Chetan Cashier", duty: /^Cashier/, email: `cashier-${run}@example.com` },
    { name: "Kiran Kitchen", duty: /^Chef \/ Kitchen/, email: `kitchen-${run}@example.com` },
  ];
  for (const s of staff) {
    await p.getByTestId("add-staff").click();
    const dlg = p.getByRole("dialog");
    await dlg.getByLabel("Name", { exact: true }).fill(s.name);
    await dlg.getByLabel("Email (Gmail)").fill(s.email);
    await dlg.getByRole("radio", { name: s.duty }).click();
    await dlg.getByLabel("Password for this person").fill("Temp12345");
    await dlg.getByRole("button", { name: "Add staff" }).click();
    await expect(p.getByTestId(`member-${s.email}`)).toBeVisible();
  }
  await expect(p.getByText("4 of 4 logins used")).toBeVisible();
  await expect(p.getByTestId("add-staff")).toBeDisabled();

  const a = await idToken(request, A.email, A.password);
  const fifth = await request.post("/api/staff", {
    headers: { Authorization: `Bearer ${a.token}` },
    data: { name: "Fifth Person", email: `fifth-${run}@example.com`, role: "waiter", password: "Temp12345" },
  });
  expect(fifth.status()).toBe(409);
  expect((await fifth.json()).code).toBe("limit");

  // Staff sign in with the Staff tab and land in their restaurant.
  const kctx = await browser.newContext();
  const k = await kctx.newPage();
  await k.goto("/login?as=staff");
  await k.getByLabel("Email").fill(staff[2].email);
  await k.getByLabel("Password", { exact: true }).fill("Temp12345");
  await k.getByRole("button", { name: "Show password" }).click();
  await expect(k.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await k.getByRole("button", { name: "Sign in as staff" }).click();
  await k.waitForURL("**/dashboard/kitchen");
  await expect(k.getByTestId(`ticket-${orderNo + 1}`)).toBeVisible();
  await k.goto("/dashboard/staff");
  await expect(k.getByText("Not available for your role")).toBeVisible();
  const kt = await idToken(request, staff[2].email, "Temp12345");
  const forbidden = await request.post("/api/menu/categories", { headers: { Authorization: `Bearer ${kt.token}` }, data: { name: "Hack" } });
  expect(forbidden.status()).toBe(403);

  // Owner sets a new password for the cashier; the new one works.
  await p.getByTestId(`member-${staff[1].email}`).getByRole("button", { name: "Set new password" }).click();
  await p.getByRole("dialog").getByLabel("New password").fill("NewPass2468");
  await p.getByRole("dialog").getByRole("button", { name: "Save new password" }).click();
  await expect(p.getByText("New password set for Chetan Cashier")).toBeVisible();
  await idToken(request, staff[1].email, "NewPass2468");

  // Owner removes the kitchen login: it is deleted and cannot sign in again.
  await p.getByTestId(`member-${staff[2].email}`).getByRole("button", { name: "Remove" }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Remove access" }).click();
  await expect(p.getByTestId(`member-${staff[2].email}`)).toHaveCount(0);
  const again = await request.post(`${AUTH}/accounts:signInWithPassword?key=demo-key`, { data: { email: staff[2].email, password: "Temp12345", returnSecureToken: true } });
  expect(again.ok()).toBeFalsy();
  const after = await request.patch(`/api/orders/abcdefghij`, { headers: { Authorization: `Bearer ${kt.token}` }, data: { status: "accepted" } });
  expect([401, 403]).toContain(after.status());
  await k.reload();
  await k.waitForURL("**/login**");
  await kctx.close();
});

test("15-16. trial status and the Pro and Premium plans", async ({ page }) => {
  const p = ownerPage;
  await p.goto("/dashboard/billing");
  await expect(p.getByTestId("billing-status")).toHaveText("Free trial");
  await expect(p.getByTestId("billing-detail")).toContainText("30 days left");
  await expect(p.getByTestId("billing-price")).toHaveText("₹349");
  await expect(p.getByTestId("plan-prem3")).toContainText("₹799");
  await expect(p.getByTestId("plan-prem6")).toContainText("₹1,299");
  await p.getByTestId("tier-switch-pro").click();
  await expect(p.getByTestId("billing-price")).toHaveText("₹249");
  await expect(p.getByTestId("plan-pro3")).toContainText("₹649");
  await expect(p.getByTestId("plan-pro6")).toContainText("₹899");
  await expect(p.getByTestId("payments-placeholder")).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByTestId("plan-price-pro")).toHaveText("₹249");
  await expect(page.getByTestId("plan-price-premium")).toHaveText("₹349");
  // Crossed-out prices are the real monthly price x months, so the savings shown are exact.
  await expect(page.getByTestId("save-pro3")).toHaveText("You save ₹98");
  await page.getByTestId("duration-pro6").click();
  await expect(page.getByTestId("save-pro6")).toHaveText("You save ₹595");
  await expect(page.getByTestId("save-prem3")).toHaveText("You save ₹248");
  await page.getByTestId("duration-prem6").click();
  await expect(page.getByTestId("save-prem6")).toHaveText("You save ₹795");
  await page.getByTestId("start-prem6").click();
  await page.waitForURL("**/register?plan=prem6");
  await page.goto("/pricing");
  // 1 person at ₹9,000 a month for a year, minus two 6-month Premium plans: 1,08,000 - 2,598.
  await expect(page.getByTestId("savings-amount")).toHaveText("₹1,05,402");
  for (const path of ["/privacy", "/terms", "/refund"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
  }
  const health = await page.request.get("/api/health");
  expect(health.status(), await health.text()).toBe(200);
});

test("closed dates: the QR menu says when it opens again; owner can delete the account", async ({ browser, request }) => {
  const C = { name: "Chetan Rao", email: `owner-c-${run}@example.com`, password: "Passw0rd-c1", restaurant: "Corner Chai", phone: "9876511111", city: "Varanasi" };
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await register(p, C);
  const c = await idToken(request, C.email, C.password);
  const auth = { Authorization: `Bearer ${c.token}` };
  const ridC = (await adminGet(request, `users/${c.uid}`)).rid.stringValue!;
  expect((await request.post("/api/seats", { headers: auth, data: { count: 1 } })).status()).toBe(201);
  const cat = await (await request.post("/api/menu/categories", { headers: auth, data: { name: "Tea" } })).json();
  const cat2 = await request.post("/api/menu/categories", { headers: auth, data: { name: "Snacks" } });
  expect(cat2.status(), "a second category can be added").toBe(201);
  const dish = await (await request.post("/api/menu/dishes", { headers: auth, data: { categoryId: cat.id, name: "Ginger Tea", price: "15" } })).json();
  const seats = await request.get(`${FS}/restaurants/${ridC}/seats`, { headers: { Authorization: "Bearer owner" } });
  const token = (await seats.json()).documents[0].fields.token.stringValue;

  expect((await request.patch("/api/restaurants", { headers: auth, data: { onboarded: true } })).ok()).toBeTruthy();

  // Closed today: the menu still shows, ordering is off and guests see when it opens.
  await p.goto("/dashboard/settings");
  await p.getByTestId("add-closed-date").click();
  await expect(p.getByTestId("closed-dates")).toContainText("Today");
  const g = await ctx.newPage();
  await g.goto(`/t/${token}`);
  await expect(g.getByText("We are closed right now")).toBeVisible();
  await expect(g.getByText(/Closed today\. We open tomorrow/)).toBeVisible();
  const blocked = await request.post("/api/orders", { data: { seatToken: token, idempotencyKey: `c-no-${run}-abcdefgh`, note: "", items: [{ dishId: dish.id, qty: 1 }] } });
  expect(blocked.status()).toBe(403);

  // Open again.
  await p.getByRole("button", { name: /^Open again on/ }).click();
  await expect(p.getByTestId("closed-dates")).toHaveCount(0);
  await g.reload();
  await expect(g.getByText("We are closed right now")).toHaveCount(0);

  // Delete the account: restaurant, QR codes and login are gone.
  await p.goto("/dashboard/account");
  await p.getByTestId("delete-account").click();
  await p.getByTestId("delete-confirm").fill(C.restaurant);
  const [del] = await Promise.all([p.waitForResponse((r) => r.url().endsWith("/api/me") && r.request().method() === "DELETE"), p.getByTestId("delete-confirm-button").click()]);
  expect(del.status()).toBe(200);
  await expect.poll(() => p.url(), { timeout: 20_000 }).toContain("deleted=1");
  const signIn = await request.post(`${AUTH}/accounts:signInWithPassword?key=demo-key`, { data: { email: C.email, password: C.password, returnSecureToken: true } });
  expect(signIn.status()).toBe(400);
  const gone = await request.get(`${FS}/restaurants/${ridC}`, { headers: { Authorization: "Bearer owner" } });
  expect(gone.status()).toBe(404);
  await g.reload();
  await expect(g.getByRole("button", { name: /^Add / })).toHaveCount(0);
  await ctx.close();
});

test("17. owner pages work on a phone", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const p = await ctx.newPage();
  await p.goto("/login");
  await p.getByLabel("Email").fill(A.email);
  await p.getByLabel("Password", { exact: true }).fill(A.password);
  await p.getByRole("button", { name: "Sign in as owner" }).click();
  await p.waitForURL("**/dashboard");
  for (const path of ["/dashboard", "/dashboard/kitchen", "/dashboard/counter", "/dashboard/menu", "/dashboard/qr", "/dashboard/staff", "/dashboard/billing", "/dashboard/settings", "/dashboard/reports", "/dashboard/account"]) {
    await p.goto(path);
    await expect(p.locator("main h1").first()).toBeVisible();
    const fits = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(fits, `${path} fits the phone screen`).toBeTruthy();
  }
  for (const path of ["/", "/pricing", "/register", "/login", "/privacy"]) {
    await p.goto(path);
    const fits = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(fits, `${path} fits the phone screen`).toBeTruthy();
  }
  await ctx.close();
});
