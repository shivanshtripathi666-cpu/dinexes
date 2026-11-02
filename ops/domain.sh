#!/usr/bin/env bash
# Dinexes: put the website on your own domain (for example dinexes.com), with a free SSL certificate.
# Uses Firebase Hosting in front of the Cloud Run website, which works for the Mumbai region.
#
# Run in Google Cloud Shell from the dinexes folder:
#   bash ops/domain.sh dinexes.com          step 1: connect; prints the DNS records to add at your domain company
#   bash ops/domain.sh dinexes.com          step 2: run again after the records are added (1 to 24 hours later)
#   bash ops/domain.sh dinexes.com google   step 3 (after adding the Google redirect address): Google sign-in on your domain
# Safe to run again. Nothing secret is printed or saved in the repo.
set -uo pipefail
cd "$(dirname "$0")/.."

REGION="asia-south1"
SERVICE="dinexes"
STATE_FILE="$HOME/.dinexes-project"
DOMAIN_FILE="$HOME/.dinexes-domain"
AUTHDOMAIN_FILE="$HOME/.dinexes-authdomain"

say()  { printf '\n\033[1;33m== %s\033[0m\n' "$*"; }
ok()   { printf '   \033[32mOK\033[0m %s\n' "$*"; }
warn() { printf '   \033[33m%s\033[0m\n' "$*"; }
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

RAW="${1:-}"
MODE="${2:-}"
[ -z "$RAW" ] && die "Write your domain after the command, for example:  bash ops/domain.sh dinexes.com"
D=$(echo "$RAW" | tr 'A-Z' 'a-z' | sed -E 's#^https?://##; s#/.*$##; s#^www\.##')
echo "$D" | grep -Eq '^[a-z0-9-]+(\.[a-z0-9-]+)+$' || die "\"$RAW\" does not look like a domain. Example: dinexes.com"
[ -f "$STATE_FILE" ] || die "Run bash ops/setup.sh first."
P=$(cat "$STATE_FILE")
gcloud config set project "$P" --quiet >/dev/null 2>&1
HOST_API="https://firebasehosting.googleapis.com/v1beta1"
IDT="https://identitytoolkit.googleapis.com"

gcloud services enable firebasehosting.googleapis.com --quiet >/dev/null 2>&1

# ---------------------------------------------------------------- google sign-in on the domain (step 3)
if [ "$MODE" = "google" ]; then
  say "Google sign-in on https://$D"
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$D/__/auth/handler")
  [ "$CODE" = "200" ] || die "https://$D is not fully live yet (sign-in page answered $CODE). Finish step 2 first."
  gcloud run services update "$SERVICE" --region "$REGION" --update-env-vars "FIREBASE_AUTH_DOMAIN=$D" --quiet >/dev/null || die "Could not update the website."
  echo "$D" > "$AUTHDOMAIN_FILE"
  ok "Google sign-in now opens on $D"
  printf '\nTest: open https://%s/login in Chrome and tap "Continue with Google".\n' "$D"
  printf 'If Google shows "redirect_uri_mismatch", the redirect address from step 3 is missing. To undo:  bash ops/domain.sh %s google-off\n' "$D"
  exit 0
fi
if [ "$MODE" = "google-off" ]; then
  gcloud run services update "$SERVICE" --region "$REGION" --update-env-vars "FIREBASE_AUTH_DOMAIN=$P.firebaseapp.com" --quiet >/dev/null || die "Could not update the website."
  rm -f "$AUTHDOMAIN_FILE"
  ok "Google sign-in is back on $P.firebaseapp.com"
  exit 0
fi

# ---------------------------------------------------------------- hosting in front of cloud run
say "1/3 Firebase Hosting in front of the website"
api POST "$HOST_API/projects/$P/sites?siteId=$P" '{}' >/dev/null 2>&1 || true
SITE="$P"
CONFIG='{"config":{"rewrites":[{"glob":"**","run":{"serviceId":"'"$SERVICE"'","region":"'"$REGION"'"}}]}}'
V=$(api POST "$HOST_API/sites/$SITE/versions" "$CONFIG" | js "d.get('name','')")
[ -z "$V" ] && die "Could not prepare Firebase Hosting. Open console.firebase.google.com -> project $P -> Hosting -> Get started once, then run this again."
api POST "$HOST_API/$V:populateFiles" '{"files":{}}' >/dev/null
api PATCH "$HOST_API/$V?update_mask=status" '{"status":"FINALIZED"}' | grep -q FINALIZED || die "Could not finish the Hosting version."
api POST "$HOST_API/sites/$SITE/releases?versionName=$V" '{}' | grep -q '"name"' || die "Could not release Hosting."
ok "https://$SITE.web.app now shows the website (it may take a minute)"

# ---------------------------------------------------------------- custom domains
say "2/3 Connecting $D and www.$D"
CD="$HOST_API/projects/$P/sites/$SITE/customDomains"
if ! api GET "$CD/$D" | grep -q '"hostState"'; then
  api POST "$CD?customDomainId=$D" '{}' >/dev/null
fi
if ! api GET "$CD/www.$D" | grep -q '"hostState"'; then
  api POST "$CD?customDomainId=www.$D" "{\"redirectTarget\":\"$D\"}" >/dev/null
fi
sleep 8

show_dns() { # prints the DNS records Firebase wants for one name
  api GET "$CD/$1" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ups = (d.get('requiredDnsUpdates') or {})
want = ups.get('desired') or []
rows = []
for s in want:
    for r in s.get('records', []):
        rows.append((r.get('requiredAction','ADD'), r.get('type',''), r.get('domainName',''), r.get('rdata','')))
for act, t, name, val in rows:
    print(f'      {act:7} {t:6} {name:30} {val}')
print('STATE', d.get('hostState','?'), d.get('ownershipState','?'), (d.get('cert') or {}).get('state','?'))
"
}

APEX=$(show_dns "$D")
WWW=$(show_dns "www.$D")
STATE=$(echo "$APEX" | grep '^STATE' | cut -d' ' -f2-)
echo
printf '   \033[1mAdd these records at the company where you bought %s (DNS settings):\033[0m\n' "$D"
printf '      ACTION  TYPE   NAME                           VALUE\n'
echo "$APEX" | grep -v '^STATE'
echo "$WWW" | grep -v '^STATE'
printf '   (ADD = add this record. REMOVE = delete this old record. Name %s means "@" at most companies.)\n' "$D"
printf '   Status: %s\n' "$STATE"

# ---------------------------------------------------------------- switch the website address
say "3/3 Website address"
if echo "$STATE" | grep -q 'HOST_ACTIVE' && echo "$STATE" | grep -q 'CERT_ACTIVE'; then
  DOMAINS=$(api GET "$IDT/admin/v2/projects/$P/config" | python3 -c "
import sys,json; d=json.load(sys.stdin).get('authorizedDomains',[])
for h in sys.argv[1:]:
    if h not in d: d.append(h)
print(json.dumps({'authorizedDomains': d}))" "$D" "www.$D" "$SITE.web.app" "$SITE.firebaseapp.com")
  api PATCH "$IDT/admin/v2/projects/$P/config?updateMask=authorizedDomains" "$DOMAINS" >/dev/null
  gcloud run services update "$SERVICE" --region "$REGION" --update-env-vars "PLATFORM_URL=https://$D" --quiet >/dev/null || die "Could not set the website address."
  echo "$D" > "$DOMAIN_FILE"
  ok "website address is now https://$D (new QR codes use it; old QR codes keep working)"
  printf '\n\033[1;32mDone:\033[0m https://%s\n' "$D"
  printf '\nOptional, for the smoothest Google sign-in on phones (step 3):\n'
  printf '  1. Open https://console.cloud.google.com/apis/credentials?project=%s\n' "$P"
  printf '  2. Tap "Web client (auto created by Google Service)".\n'
  printf '  3. Under "Authorized redirect URIs" tap ADD URI and paste:  https://%s/__/auth/handler   then SAVE.\n' "$D"
  printf '  4. Run:  bash ops/domain.sh %s google\n' "$D"
else
  warn "Not live yet. Add the records above, wait 1 to 24 hours, then run this same command again."
  printf '   Meanwhile the website keeps working at its current address.\n'
fi
