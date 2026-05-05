#!/bin/bash
# =============================================================================
# deploy.sh — pełny cykl deploymentu pliku z repo do CDN.
#
# Wykonuje: snapshot → git add/commit/push → double-purge jsDelivr → verify.
# Zaprojektowane jako jedno wywołanie zamiast 5 ręcznych komend.
#
# Użycie:
#   ./deploy.sh <plik> "<commit message>"
#
# Przykłady:
#   ./deploy.sh site-footer.js "fix: cursor scroll visibility na transition arrival"
#   ./deploy.sh pages/home/footer.js "tweak: initLogoGrid INTERVAL z 1500 na 2000"
#
# Wymaga: git, curl, snapshot.sh w tym samym katalogu, gh auth (lub HTTPS push token).
# =============================================================================

set -e

GH_USER="solowsolow"
GH_REPO="done-webflow-code"

if [ $# -lt 2 ]; then
  echo "Użycie: $0 <plik> \"<commit message>\"" >&2
  echo "Przykład: $0 site-footer.js \"fix: cursor scroll trigger\"" >&2
  exit 1
fi

FILE="$1"
MSG="$2"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"

# Sanity: jesteśmy w odpowiednim repo
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ ! "$REMOTE_URL" =~ "$GH_REPO" ]]; then
  echo "✗ Nie jesteś w repo $GH_REPO (origin: $REMOTE_URL)" >&2
  exit 1
fi

cd "$REPO_ROOT"

if [ ! -f "$FILE" ]; then
  echo "✗ Plik nie istnieje: $FILE" >&2
  exit 1
fi

# Krok 1 — snapshot przed edycją (defensywnie, na wypadek gdyby user nie wywołał osobno)
echo "==> [1/5] Snapshot"
"$REPO_ROOT/snapshot.sh" "$FILE"

# Krok 2 — sprawdź czy są zmiany do commitu
if [ -z "$(git status --porcelain "$FILE")" ]; then
  echo "✗ Brak zmian w $FILE — nic do commitu" >&2
  exit 1
fi

# Krok 3 — commit + push
echo "==> [2/5] Commit + push"
git add "$FILE"
git commit -m "$MSG"
git push

# Krok 4 — double purge (z testu: pierwszy purge czyści tylko front edge,
# drugi dociera do middle cache)
CDN_PATH="/gh/$GH_USER/$GH_REPO@main/$FILE"
echo "==> [3/5] Double purge jsDelivr: $CDN_PATH"
curl -s "https://purge.jsdelivr.net$CDN_PATH" > /dev/null && echo "    Purge 1: done"
sleep 2
curl -s "https://purge.jsdelivr.net$CDN_PATH" > /dev/null && echo "    Purge 2: done"

# Krok 5 — verify (3 próby z odstępami; porównanie hash CDN vs lokalny)
echo "==> [4/5] Verify (3 próby, hash CDN vs lokalny)"
sleep 1
LOCAL_HASH=$(git hash-object "$FILE")
ALL_MATCH=1
for i in 1 2 3; do
  CDN_HASH=$(curl -s "https://cdn.jsdelivr.net$CDN_PATH" | git hash-object --stdin)
  if [ "$CDN_HASH" = "$LOCAL_HASH" ]; then
    echo "    Próba $i: MATCH ✓"
  else
    echo "    Próba $i: MISMATCH ✗ (CDN: $CDN_HASH, lokalny: $LOCAL_HASH)"
    ALL_MATCH=0
  fi
  [ $i -lt 3 ] && sleep 1
done

# Pobierz krótki commit-hash (do hot-fix URL workaround)
COMMIT_SHORT=$(git rev-parse --short HEAD)
COMMIT_PATH="/gh/$GH_USER/$GH_REPO@$COMMIT_SHORT/$FILE"

# Podsumowanie
echo ""
if [ $ALL_MATCH -eq 1 ]; then
  echo "==> [5/5] ✓ Deploy complete"
  echo ""
  echo "    @main URL (default, zmiany propagują się automatycznie):"
  echo "      https://cdn.jsdelivr.net$CDN_PATH"
  echo ""
  echo "    @$COMMIT_SHORT URL (hot-fix workaround — gdy @main edge cache trzyma stale):"
  echo "      https://cdn.jsdelivr.net$COMMIT_PATH"
  echo ""
  echo "    Reload strony — bez Webflow republish."
else
  echo "==> [5/5] ⚠ Deploy zakończony z mismatchami"
  echo ""
  echo "    Niektóre próby pokazały starą wersję — jsDelivr edge cache trzyma stale."
  echo "    UWAGA: @main URL może mieć stale content na konkretnym edge przez 8-12h+,"
  echo "    immune na purge (zaobserwowane 2026-05-06). Query string ?v=... ignored."
  echo ""
  echo "    Workaround #1: kolejny purge (zwykle pomaga jeśli throttle clear):"
  echo "      curl https://purge.jsdelivr.net$CDN_PATH"
  echo ""
  echo "    Workaround #2: w Webflow podmień URL na commit-hash (gwarantowany fresh fetch):"
  echo "      https://cdn.jsdelivr.net$COMMIT_PATH"
  echo "    Po ~24h @main edge cache odświeży się sam, można wrócić."
  exit 2
fi
