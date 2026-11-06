#!/usr/bin/env bash
# Dinexes: one-time set-up of a new Google Cloud + Firebase project and the first deploy to Cloud Run.
# Run in Google Cloud Shell from the dinexes folder:   bash ops/setup.sh
# Safe to run again: every step checks what already exists.
# Nothing secret is printed or saved in the repo.
set -uo pipefail
cd "$(dirname "$0")/.."

REGION="asia-south1"
SERVICE="dinexes"
STATE_FILE="$HOME/.dinexes-project"
BILLING_FROM="${BILLING_FROM:-cs-project-an654hen}"

say()  { printf '\n\033[1;33m== %s\033[0m\n' "$*"; }
ok()   { printf '   \033[32mOK\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31mSTOPPED:\033[0m %s\n' "$*"; exit 1; }
tok()  { gcloud auth print-access-token; }
api()  { # api METHOD URL [JSON]
  local m=$1 u=$2 d=${3:-}
  if [ -n "$d" ]; then
    curl -sS -X "$m" -H "Authorization: Bearer $(tok)" -H "Content-Type: application/json" -H "X-Goog-User-Project: $P" "$u" -d "$d"
  else
    curl -sS -X "$m" -H "Authorization: Bearer $(tok)" -H "X-Goog-User-Project: $P" "$u"
  fi
}
js()   { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null; }
wait_op() { # wait_op BASEURL OPNAME
  for _ in $(seq 1 60); do
    local r; r=$(api GET "$1/$2")
    if [ "$(echo "$r" | js "d.get('done',False)")" = "True" ]; then echo "$r"; return 0; fi
    sleep 3
  done
  return 1
}

# ---------------------------------------------------------------- project
say "1/9 Project"
if [ -n "${PROJECT_ID:-}" ]; then P="$PROJECT_ID"; elif [ -f "$STATE_FILE" ]; then P=$(cat "$STATE_FILE"); else P="dinexes-$(tr -dc 'a-z0-9' </dev/urandom | head -c 6)"; fi
if gcloud projects describe "$P" >/dev/null 2>&1; then
  ok "using existing project $P"
else
  gcloud projects create "$P" --name="Dinexes" --quiet || die "Could not create project $P. If your project quota is full, pick an unused project and run:  PROJECT_ID=<its id> bash ops/setup.sh"
  ok "created project $P"
fi
echo "$P" > "$STATE_FILE"
gcloud config set project "$P" --quiet >/dev/null 2>&1

say "2/9 Billing (Cloud Run needs it; usage stays inside the free tier at first)"
if [ "$(gcloud billing projects describe "$P" --format='value(billingEnabled)' 2>/dev/null)" = "True" ]; then
  ok "billing already linked"
else
  ACC=$(gcloud billing projects describe "$BILLING_FROM" --format='value(billingAccountName)' 2>/dev/null)
  [ -z "$ACC" ] && ACC=$(gcloud billing accounts list --filter=open=true --format='value(name)' --limit=1 2>/dev/null)
  [ -z "$ACC" ] && die "No billing account found. Open console.cloud.google.com/billing, then run this again."
  gcloud billing projects link "$P" --billing-account="${ACC#billingAccounts/}" --quiet >/dev/null || die "Could not link billing."
  ok "linked billing account ${ACC#billingAccounts/}"
fi

say "3/9 Turning on Google services (takes 1-2 minutes)"
gcloud services enable firebase.googleapis.com firestore.googleapis.com identitytoolkit.googleapis.com \
  firebaserules.googleapis.com firebasestorage.googleapis.com storage.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com fcm.googleapis.com secretmanager.googleapis.com \
  iam.googleapis.com compute.googleapis.com firebasehosting.googleapis.com iamcredentials.googleapis.com --quiet || die "Could not enable services."
ok "services on"

# ---------------------------------------------------------------- firebase
say "4/9 Firebase"
FB="https://firebase.googleapis.com/v1beta1"
if [ "$(api GET "$FB/projects/$P" | js "d.get('projectId','')")" = "$P" ]; then
  ok "Firebase already added"
else
  OP=$(api POST "$FB/projects/$P:addFirebase" '{}' | js "d.get('name','')")
  [ -z "$OP" ] && die "Could not add Firebase. Open console.firebase.google.com, accept the terms once, then run this again."
  wait_op "$FB" "$OP" >/dev/null || die "Firebase set-up did not finish. Run this again."
  ok "Firebase added"
fi

APP_ID=$(api GET "$FB/projects/$P/webApps" | js "[a['appId'] for a in d.get('apps',[]) if a.get('state')=='ACTIVE'][0]")
if [ -z "$APP_ID" ]; then
  OP=$(api POST "$FB/projects/$P/webApps" '{"displayName":"dinexes-web"}' | js "d.get('name','')")
  R=$(wait_op "$FB" "$OP") || die "Could not create the web app."
  APP_ID=$(echo "$R" | js "d['response']['appId']")
fi
CFG=$(api GET "$FB/projects/$P/webApps/$APP_ID/config")
API_KEY=$(echo "$CFG" | js "d['apiKey']")
AUTH_DOMAIN=$(echo "$CFG" | js "d.get('authDomain','')")
SENDER=$(echo "$CFG" | js "d.get('messagingSenderId','')")
[ -z "$API_KEY" ] && die "Could not read the web app settings."
ok "web app $APP_ID"

# Google sign-in uses the project's Firebase sign-in page (needs the default Hosting site).
api POST "https://firebasehosting.googleapis.com/v1beta1/projects/$P/sites?siteId=$P" '{}' >/dev/null 2>&1 || true

# Android app (Dinexes app on Play Store): registered in Firebase, with the app's signing fingerprints.
ANDROID_PKG="com.dinexes.app"
ANDROID_ID=$(api GET "$FB/projects/$P/androidApps" | js "[a['appId'] for a in d.get('apps',[]) if a.get('packageName')=='$ANDROID_PKG' and a.get('state')=='ACTIVE'][0]")
if [ -z "$ANDROID_ID" ]; then
  OP=$(api POST "$FB/projects/$P/androidApps" "{\"packageName\":\"$ANDROID_PKG\",\"displayName\":\"Dinexes Android\"}" | js "d.get('name','')")
  R=$(wait_op "$FB" "$OP") && ANDROID_ID=$(echo "$R" | js "d['response']['appId']")
fi
if [ -n "$ANDROID_ID" ] && command -v keytool >/dev/null 2>&1 && [ -f android/app/debug.keystore ]; then
  KS=$(keytool -list -v -keystore android/app/debug.keystore -storepass android 2>/dev/null)
  EXIST=$(api GET "$FB/projects/$P/androidApps/$ANDROID_ID/sha")
  for t in SHA1 SHA256; do
    H=$(echo "$KS" | grep -m1 "$t:" | awk '{print $2}' | tr -d ':' | tr 'A-F' 'a-f')
    if [ -n "$H" ] && ! echo "$EXIST" | grep -q "$H"; then
      api POST "$FB/projects/$P/androidApps/$ANDROID_ID/sha" "{\"shaHash\":\"$H\",\"certType\":\"$( [ $t = SHA1 ] && echo SHA_1 || echo SHA_256 )\"}" >/dev/null
    fi
  done
fi
[ -n "$ANDROID_ID" ] && ok "Android app $ANDROID_ID"

say "5/9 Database (Firestore, Mumbai)"
if gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  ok "database exists"
else
  gcloud firestore databases create --location="$REGION" --type=firestore-native --quiet >/dev/null || die "Could not create the database."
  ok "database created"
fi
RULES="https://firebaserules.googleapis.com/v1"
deploy_rules() { # deploy_rules FILE RELEASE
  local body; body=$(python3 -c "import json,sys; print(json.dumps({'source':{'files':[{'name':sys.argv[1],'content':open(sys.argv[1]).read()}]}}))" "$1")
  local rs; rs=$(api POST "$RULES/projects/$P/rulesets" "$body" | js "d['name']")
  [ -z "$rs" ] && die "Rules in $1 were not accepted."
  local rel="projects/$P/releases/$2"
  if api GET "$RULES/$rel" | grep -q '"rulesetName"'; then
    api PATCH "$RULES/$rel" "{\"release\":{\"name\":\"$rel\",\"rulesetName\":\"$rs\"}}" >/dev/null
  else
    api POST "$RULES/projects/$P/releases" "{\"name\":\"$rel\",\"rulesetName\":\"$rs\"}" >/dev/null
  fi
}
deploy_rules firestore.rules cloud.firestore
ok "security rules published"

say "6/9 Logins (email and password)"
IDT="https://identitytoolkit.googleapis.com"
if ! api GET "$IDT/admin/v2/projects/$P/config" | grep -q '"signIn"'; then
  api POST "$IDT/v2/projects/$P/identityPlatform:initializeAuth" '{}' >/dev/null
  sleep 5
fi
api PATCH "$IDT/admin/v2/projects/$P/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired" \
  '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}' | grep -q '"signIn"' || die "Could not turn on email logins."
api PATCH "$IDT/admin/v2/projects/$P/config?updateMask=passwordPolicyConfig,emailPrivacyConfig" \
  '{"passwordPolicyConfig":{"passwordPolicyEnforcementState":"ENFORCE","forceUpgradeOnSignin":false,"passwordPolicyVersions":[{"customStrengthOptions":{"minPasswordLength":8,"maxPasswordLength":64,"containsNumericCharacter":true}}]},"emailPrivacyConfig":{"enableImprovedEmailPrivacy":true}}' >/dev/null
api PATCH "$IDT/admin/v2/projects/$P/config?updateMask=signIn.phoneNumber.enabled" '{"signIn":{"phoneNumber":{"enabled":true}}}' >/dev/null
# OTP SMS only to Indian numbers: stops SMS-fraud bills from other countries.
api PATCH "$IDT/admin/v2/projects/$P/config?updateMask=smsRegionConfig" '{"smsRegionConfig":{"allowlistOnly":{"allowedRegions":["IN"]}}}' >/dev/null
WEB_CLIENT_ID=$(api GET "$IDT/admin/v2/projects/$P/defaultSupportedIdpConfigs/google.com" | js "d.get('clientId','') if d.get('enabled') else ''")
ok "email and phone logins on (passwords: 8+ characters with a number; emails cannot be probed)"
if [ -z "$WEB_CLIENT_ID" ]; then
  printf '   \033[33mGoogle sign-in is off.\033[0m Turn it on once: console.firebase.google.com -> project %s -> Authentication -> Sign-in method -> Add new provider -> Google -> Enable -> Save. Then run this script again.\n' "$P"
fi

say "7/9 Photo storage"
BUCKET="$P-media"
if ! gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access --quiet >/dev/null || die "Could not create the photo bucket."
fi
api POST "https://firebasestorage.googleapis.com/v1beta/projects/$P/buckets/$BUCKET:addFirebase" '{}' >/dev/null
deploy_rules storage.rules "firebase.storage/$BUCKET"
ok "bucket $BUCKET"

# ---------------------------------------------------------------- run
PN=$(gcloud projects describe "$P" --format='value(projectNumber)')
BUILD_SA="${PN}-compute@developer.gserviceaccount.com"
RUN_SA="dinexes-run@$P.iam.gserviceaccount.com"
say "8/9 Permissions (the website gets only what it needs)"
if ! gcloud iam service-accounts describe "$RUN_SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create dinexes-run --display-name="Dinexes website" --quiet >/dev/null || die "Could not create the website's service account."
  sleep 5
fi
grant() { # grant MEMBER ROLE
  gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$1" --role="$2" --condition=None --quiet >/dev/null 2>&1 \
    || { sleep 10; gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$1" --role="$2" --condition=None --quiet >/dev/null; } \
    || die "Could not give $2 to $1."
}
for r in roles/datastore.user roles/firebaseauth.admin roles/firebasecloudmessaging.admin; do grant "$RUN_SA" "$r"; done
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$RUN_SA" --role=roles/storage.objectAdmin --quiet >/dev/null || die "Could not give photo access."
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$RUN_SA" --role=roles/storage.legacyBucketReader --quiet >/dev/null || true
for r in roles/cloudbuild.builds.builder roles/artifactregistry.writer roles/storage.objectAdmin roles/logging.logWriter; do grant "$BUILD_SA" "$r"; done
# The website may sign the Android app's built-in browser in (one-time tokens): it signs as itself only.
gcloud iam service-accounts add-iam-policy-binding "$RUN_SA" --member="serviceAccount:$RUN_SA" --role=roles/iam.serviceAccountTokenCreator --quiet >/dev/null 2>&1 || true
# The old setup gave extra power to the build account; take back what the website no longer needs.
gcloud projects remove-iam-policy-binding "$P" --member="serviceAccount:$BUILD_SA" --role=roles/iam.serviceAccountTokenCreator --quiet >/dev/null 2>&1 || true
ok "permissions set"

say "9/9 Building and deploying the website (5-10 minutes)"
[ -f "$HOME/.dinexes-authdomain" ] && AUTH_DOMAIN=$(cat "$HOME/.dinexes-authdomain")
ENV="FIREBASE_PROJECT_ID=$P,FIREBASE_WEB_API_KEY=$API_KEY,FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN:-$P.firebaseapp.com},FIREBASE_STORAGE_BUCKET=$BUCKET,FIREBASE_MESSAGING_SENDER_ID=$SENDER,FIREBASE_APP_ID=$APP_ID,ANDROID_APP_ID=${ANDROID_ID:-},GOOGLE_WEB_CLIENT_ID=${WEB_CLIENT_ID:-}"
gcloud run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated --quiet \
  --memory 512Mi --cpu 1 --min-instances 0 --max-instances 3 --service-account "$RUN_SA" --update-env-vars "$ENV" || die "Deploy failed. Run this again; if it fails twice, send me a screenshot."
# Public website: anyone may open it. If an organisation policy blocks "allUsers", turn off the invoker check instead.
gcloud run services add-iam-policy-binding "$SERVICE" --region "$REGION" --member=allUsers --role=roles/run.invoker --quiet >/dev/null 2>&1 \
  || gcloud run services update "$SERVICE" --region "$REGION" --no-invoker-iam-check --quiet >/dev/null 2>&1 \
  || die "Could not make the website public."
URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
# Own domain connected with ops/domain.sh: keep using it as the website address.
SITE_URL="$URL"
[ -f "$HOME/.dinexes-domain" ] && SITE_URL="https://$(cat "$HOME/.dinexes-domain")"
gcloud run services update "$SERVICE" --region "$REGION" --update-env-vars "PLATFORM_URL=$SITE_URL" --quiet >/dev/null || die "Could not set the website address."
HOST=${URL#https://}
DOMAINS=$(api GET "$IDT/admin/v2/projects/$P/config" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('authorizedDomains',[]); h=sys.argv[1]
print(json.dumps({'authorizedDomains': d + ([h] if h not in d else [])}))" "$HOST")
api PATCH "$IDT/admin/v2/projects/$P/config?updateMask=authorizedDomains" "$DOMAINS" >/dev/null

printf '\n\033[1;32mDinexes is live:\033[0m %s\n' "$SITE_URL"
if [ -z "$WEB_CLIENT_ID" ]; then
  printf '\033[33mGoogle sign-in is still off\033[0m (see the note in step 6/9).\n'
fi
printf 'Project: %s   (saved in %s)\n' "$P" "$STATE_FILE"
printf 'Open the address on your phone, tap "Start free trial" and register your restaurant.\n'
