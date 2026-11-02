# Dinexes

QR dine-in ordering for restaurants. Guests scan the QR code on their seat, order from their phone
browser (no app, no login), the kitchen phone chimes and reads the order aloud, the counter sees it
live, and the owner manages menu, seats, staff, trial and billing. ₹399 per restaurant per month,
30-day free trial, up to 4 staff logins, no commission.

> **हिंदी में सार:** ग्राहक सीट का QR स्कैन करके फ़ोन से ऑर्डर करता है। किचन फ़ोन पर आवाज़ में
> ऑर्डर सुनाई देता है, काउंटर पर लाइव दिखता है। मालिक मेन्यू, सीट, स्टाफ़ (अधिकतम 4) और बिलिंग
> संभालता है। ₹399 / महीना, 30 दिन फ़्री ट्रायल। नीचे सेटअप के कदम हैं।

---

## What is in this version

| Area | Status |
|---|---|
| Landing and pricing pages | Done |
| Owner registration, email verification email, 6-step onboarding | Done |
| Menu: categories, dishes, prices, veg/non-veg, photos, sold-out switch | Done |
| Seats with secret QR tokens; download PNG, print A4 cards, replace code, disable, delete | Done |
| Guest menu per seat, cart, special instructions, order confirmation, live status, order again | Done |
| Orders created only on the server: prices from the database, idempotent, rate-limited per seat | Done |
| Kitchen screen: live tickets, accept / preparing / ready, chime, voice (English, Hindi), repeat, history, reminders, screen kept awake | Done |
| Background push notifications (Firebase Cloud Messaging) | Done, needs a VAPID key (see below) |
| Counter screen: live, filters, ready list, served, paid cash/UPI, cancel | Done |
| Owner overview and reports from real data (daily sales, best sellers, CSV) | Done |
| Staff: 4 logins per restaurant including the owner, roles, revoke | Done |
| 30-day trial, expiry blocks new orders, billing page, payment history | Done |
| Online payment of the ₹399 plan (Razorpay) | Code done; switched off until you add keys |
| Restaurant sub-domains and custom domains | Prepared (middleware + `domains` collection); off until you set a domain |
| Restaurant discovery, delivery, online payment for food | Not in this version (by design) |

## How it is built

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4**: one app serves the website, the guest menu and every dashboard.
- **Firebase Authentication**: email and password logins for owners and staff. Guests never log in.
- **Cloud Firestore**: the database, with live updates for kitchen, counter and order status.
- **Firebase Storage**: logo, cover and dish photos (uploaded through the server only).
- **Firebase Cloud Messaging**: optional background push to kitchen devices.
- **Google Cloud Run**: runs the app (Docker). Free tier covers early restaurants.

### Security model

- **One restaurant per workspace.** Every record lives under `restaurants/{restaurantId}/...`.
- **Browsers never write to the database.** All changes go through `/api/*` routes, which verify the Firebase
  ID token, read the user's membership from the database on every request, and check the role
  (`src/lib/roles.ts`). Hiding a button is never the only protection.
- **Firestore rules** (`firestore.rules`) let signed-in staff *read* only their own restaurant's data, and
  only while their membership exists. Guests can read one order status by its secret token.
- **Seat QR codes** carry a random 22-character token. The server maps it to restaurant + seat; the
  browser never says which seat it is. Replacing a code stops the old one immediately.
- **Prices and totals are calculated on the server** from the menu. Extra fields sent by a browser are ignored.
- **Idempotency:** each checkout sends a key; the same key always returns the same order.
- **Staff limit:** checked again inside a database transaction, so the fifth login is refused even if two requests race.
- **Revoking staff** deletes the membership and signs them out; their next request is refused.
- **No card data** is ever handled here. The plan payment uses Razorpay Checkout and is only marked
  paid after the server verifies Razorpay's signature.

### Roles

| | Owner | Manager | Cashier | Kitchen |
|---|---|---|---|---|
| Kitchen screen, change order status | ✓ | ✓ | (serve only) | ✓ (accept, preparing, ready) |
| Counter screen, payments | ✓ | ✓ | ✓ | |
| Sold-out switch | ✓ | ✓ | | ✓ |
| Menu, seats and QR codes, reports | ✓ | ✓ | | |
| Staff, billing, settings | ✓ | | | |

### Data model (Firestore)

```
restaurants/{rid}                 name, slug, trialEndsAt, subscription, settings, orderSeq ...
  members/{uid}                   role, name, email           (max 4)
  categories/{id}, dishes/{id}    menu (pricePaise as whole paise)
  seats/{id}                      number, label, token, active
  orders/{id}                     number, seat, items, totalPaise, status, paymentStatus ...
  days/{YYYY-MM-DD}               orders, salesPaise, collectedPaise, dishes   (India time)
  payments/{razorpayOrderId}      plan payments
  pushTokens/{id}                 devices for push
seatTokens/{token}                rid, sid       (server only)
orderStatus/{publicToken}         what the guest's phone shows
slugs/{slug}, domains/{host}      address lookups (server only)
users/{uid}                       rid, role
```

---

## Set-up from scratch (about 45 minutes, all from Cloud Shell)

### 1. Accounts you need
- Google account with a **Firebase project** (free Spark plan works to start; Cloud Storage for Firebase
  may ask you to enable the Blaze pay-as-you-go plan, which stays free within its free limits).
- **Google Cloud billing** on the same project (needed by Cloud Run; free tier applies).
- Optional: **Razorpay** account for collecting the ₹399 subscription.
- Optional: a domain name.

### 2. Create the Firebase project
1. console.firebase.google.com → **Add project** → name it `dinexes`.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** → production mode → region `asia-south1 (Mumbai)`.
4. **Build → Storage → Get started** (same region).
5. **Project settings → Your apps → Web (</>)** → register app `dinexes-web`. Copy the config values.
6. Optional push: **Project settings → Cloud Messaging → Web Push certificates → Generate key pair**. Copy the key.

### 3. Deploy the database rules (Cloud Shell)
```bash
cd ~/dinexes && git pull
npx --yes firebase-tools@14 login --no-localhost
npx --yes firebase-tools@14 deploy --only firestore:rules,storage --project YOUR_FIREBASE_PROJECT_ID
```

### 4. Deploy the app to Cloud Run (Cloud Shell)
```bash
cd ~/dinexes
gcloud config set project YOUR_FIREBASE_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud run deploy dinexes --source . --region asia-south1 --allow-unauthenticated \
  --set-env-vars "FIREBASE_PROJECT_ID=...,FIREBASE_WEB_API_KEY=...,FIREBASE_AUTH_DOMAIN=...,FIREBASE_STORAGE_BUCKET=...,FIREBASE_MESSAGING_SENDER_ID=...,FIREBASE_APP_ID=...,FIREBASE_VAPID_KEY=..."
```
Then set the public address (QR codes point to it) using the URL Cloud Run printed:
```bash
gcloud run services update dinexes --region asia-south1 --update-env-vars PLATFORM_URL=https://dinexes-xxxxx.asia-south1.run.app
```
Finally add that host under **Firebase → Authentication → Settings → Authorized domains**.

Cloud Run uses its own service account, so no key file is needed. Give it access once:
```bash
PN=$(gcloud projects describe YOUR_FIREBASE_PROJECT_ID --format='value(projectNumber)')
for r in roles/datastore.user roles/firebaseauth.admin roles/storage.objectAdmin roles/firebasecloudmessaging.admin; do
  gcloud projects add-iam-policy-binding YOUR_FIREBASE_PROJECT_ID --member="serviceAccount:${PN}-compute@developer.gserviceaccount.com" --role=$r
done
```

### 5. Local development (optional)
```bash
npm install
cp .env.example .env.local     # fill in, or use the emulators:
npm run emulators              # terminal 1 (needs Java)
USE_FIREBASE_EMULATORS=1 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 npm run dev    # terminal 2
```

### 6. Tests
GitHub Actions (`.github/workflows/ci.yml`) runs on every push: install, type check, production build,
then the full restaurant flow in a real browser against the Firebase emulators (`e2e/flow.spec.ts`):
register, menu, 10 seats, QR codes, guest order from Seat 2 on a phone screen, kitchen ticket and
voice text, counter, status changes reaching the guest, re-ordering, server-side prices, duplicate
submission, isolation between two restaurants (API and database rules), 4 staff logins and the 5th
refused, role limits, revoking a login, trial and expiry, the ₹399 plan, and phone-width layouts.

---

## Connect payments (Razorpay)

1. Razorpay Dashboard → **Account & Settings → API Keys → Generate Key** (start in Test mode).
2. In Cloud Shell, from the dinexes folder:
   ```bash
   bash ops/razorpay.sh
   ```
   It asks for the Key ID and Key secret (the secret is typed hidden and stored in Secret Manager), then prints the webhook address.
3. Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**: paste the URL and secret the script printed, tick only **order.paid**.
4. The Billing page shows Pro and Premium (1, 3 and 6 months). Each payment adds its months, starting when the current trial or paid period ends.
5. When ready, run `bash ops/razorpay.sh` again with Live keys.

Until the keys are set, the billing page clearly says payment is not connected, and nothing can be marked paid.
Automatic monthly charging (Razorpay Subscriptions with mandates) is a later step; this version uses a pay-per-period checkout.

## Voice announcements and notifications

- On the kitchen phone: open **Kitchen** (Chrome on Android recommended), tap **Start kitchen mode** once.
  This unlocks sound, asks for notification permission, registers push (if a VAPID key is set) and keeps the screen awake.
- Every new order: chime + large ticket + voice, e.g. *“New order. Seat number 2. one Chicken Biryani and two Cold Coffee. Order number 104.”*
- Controls: voice on/off, English / हिंदी, volume, test voice, repeat per order, announcement history, reminders for orders not yet accepted.
- Hindi needs a Hindi voice on the phone: Android **Settings → Text-to-speech → Google → Install voice data → Hindi**.

**Limits (honest):** browsers cannot speak while the phone is locked or the browser is closed, and sound
only works after a tap on the page. With the screen locked, the phone gets a push notification with its
normal sound instead (when push is set up). Best practice: keep the kitchen phone on charge with the kitchen
screen open. Orders always stay visible on screen even if sound fails.

## Custom domains

1. Buy a domain (for example `dinexes.in`). Map it to Cloud Run:
   `gcloud beta run domain-mappings create --service dinexes --domain app.dinexes.in --region asia-south1`
   and add the DNS records it prints. HTTPS certificates are automatic.
2. Set `PLATFORM_URL=https://app.dinexes.in` (QR codes use it) and add the domain to Firebase **Authorized domains**.
   Reprint QR cards after changing `PLATFORM_URL`.
3. Restaurant sub-domains (`royal-biryani.dinexes.in`): set `PLATFORM_DOMAIN=dinexes.in` and put a load balancer
   with a wildcard certificate in front of Cloud Run (Cloud Run domain mappings do not support wildcards).
4. A restaurant's own domain: add document `domains/{their-host}` = `{ rid: "<restaurant id>" }`, set `CUSTOM_DOMAINS=1`,
   and map their domain to the service.

The domain is never hard-coded: everything reads `PLATFORM_URL` / `PLATFORM_DOMAIN`.

## Known limitations

- Voice cannot play with the screen locked or browser closed (browser rule); push notification is the fallback.
- Push notifications need HTTPS and a VAPID key; iPhones need the site added to the Home Screen.
- The plan is paid one period at a time; automatic renewal is not built yet.
- Email verification is sent but not required to use the dashboard.
- Reports count sales when an order is placed (cancelled orders are subtracted); "Collected" counts what the counter marked paid.
- Day boundaries use India time (Asia/Kolkata).

## Your own domain

Connect a domain you own (free SSL, through Firebase Hosting in front of Cloud Run):

```
bash ops/domain.sh yourdomain.com
```

It prints the DNS records to add at your domain company. Run the same command again once they are live
(1 to 24 hours). After that `ops/setup.sh` keeps the domain as the website address. For Google sign-in on the
domain itself, add `https://yourdomain.com/__/auth/handler` to the OAuth web client's redirect URIs and run
`bash ops/domain.sh yourdomain.com google`.
