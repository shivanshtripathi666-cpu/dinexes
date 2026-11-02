#!/usr/bin/env bash
# Dinexes: connect Razorpay so owners can pay for Pro / Premium online.
# Run in Google Cloud Shell from the dinexes folder:
#   bash ops/razorpay.sh
# It asks for your Razorpay Key ID and Key secret (the secret is typed hidden and stored in Secret Manager,
# never printed or saved in the repo), and prints the webhook address to paste into the Razorpay dashboard.
# Safe to run again (for example to switch from Test keys to Live keys).
set -uo pipefail
cd "$(dirname "$0")/.."

REGION="asia-south1"
SERVICE="dinexes"
STATE_FILE="$HOME/.dinexes-project"

say() { printf '\n\033[1;33m== %s\033[0m\n' "$*"; }
ok()  { printf '   \033[32mOK\033[0m %s\n' "$*"; }
die() { printf '\n\033[31mSTOPPED:\033[0m %s\n' "$*"; exit 1; }

[ -f "$STATE_FILE" ] || die "Run bash ops/setup.sh first."
P=$(cat "$STATE_FILE")
gcloud config set project "$P" --quiet >/dev/null 2>&1
gcloud services enable secretmanager.googleapis.com --quiet >/dev/null 2>&1

say "1/3 Your Razorpay keys"
echo "   Razorpay Dashboard -> Account & Settings -> API Keys -> Generate Key (start with Test mode)."
read -r -p "   Key ID (starts with rzp_test_ or rzp_live_): " KEY_ID
KEY_ID=$(printf %s "$KEY_ID" | tr -d '[:space:]')
case "$KEY_ID" in rzp_test_*|rzp_live_*) ;; *) die "That does not look like a Razorpay Key ID. It starts with rzp_test_ or rzp_live_." ;; esac
read -r -s -p "   Key secret (typing is hidden): " KEY_SECRET; echo
KEY_SECRET=$(printf %s "$KEY_SECRET" | tr -d '[:space:]')
[ -n "$KEY_SECRET" ] || die "The Key secret was empty."

say "2/3 Webhook secret"
echo "   Press Enter to let me make a strong one, or paste your own."
read -r -s -p "   Webhook secret: " WH; echo
WH=$(printf %s "$WH" | tr -d '[:space:]')
if [ -z "$WH" ]; then WH=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32); GENERATED=1; else GENERATED=0; fi

say "3/3 Saving to your website"
put_secret() { # put_secret NAME VALUE
  if gcloud secrets describe "$1" >/dev/null 2>&1; then
    printf %s "$2" | gcloud secrets versions add "$1" --data-file=- --quiet >/dev/null || return 1
  else
    printf %s "$2" | gcloud secrets create "$1" --data-file=- --quiet >/dev/null || return 1
  fi
}
put_secret razorpay-key-secret "$KEY_SECRET" || die "Could not save the Key secret."
put_secret razorpay-webhook-secret "$WH" || die "Could not save the webhook secret."
unset KEY_SECRET

# Let the website read the two secrets.
SA=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null)
if [ -z "$SA" ]; then SA="$(gcloud projects describe "$P" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"; fi
for s in razorpay-key-secret razorpay-webhook-secret; do
  gcloud secrets add-iam-policy-binding "$s" --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor" --quiet >/dev/null 2>&1
done

gcloud run services update "$SERVICE" --region "$REGION" \
  --update-env-vars "RAZORPAY_KEY_ID=$KEY_ID" \
  --update-secrets "RAZORPAY_KEY_SECRET=razorpay-key-secret:latest,RAZORPAY_WEBHOOK_SECRET=razorpay-webhook-secret:latest" \
  --quiet >/dev/null || die "Could not update the website."
ok "Razorpay is connected ($KEY_ID)"

URL=$(cat "$HOME/.dinexes-domain" 2>/dev/null | sed 's#^#https://#')
[ -n "$URL" ] || URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)' 2>/dev/null)

printf '\n\033[1mLast step, in the Razorpay Dashboard (Settings -> Webhooks -> Add New Webhook):\033[0m\n'
printf '   Webhook URL : %s/api/billing/webhook\n' "$URL"
printf '   Event       : order.paid  (tick only this one)\n'
if [ "$GENERATED" = "1" ]; then
  printf '   Secret      : %s\n' "$WH"
  printf '                 (copy this now; it is also saved in Secret Manager as razorpay-webhook-secret)\n'
else
  printf '   Secret      : the one you typed\n'
fi
printf '\nTest: open %s/api/health and check that payments says "connected".\n' "$URL"
printf 'Then pay with a Razorpay test card from the Billing page of a test restaurant. When all is fine, run this script again with Live keys.\n'
