#!/usr/bin/env bash
# Verifies the vendored contract copy byte-for-byte against contracts.lock.
#
# The backend owns contracts/. This repository holds a read-only vendored copy.
# Any drift - an edited contract, a missing file, an extra file, a version
# mismatch - fails here, which stops the loop through the deterministic check.
#
# Exit codes: 0 = identical, 1 = drift detected, 2 = usage/setup error.

set -u

root="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -n "$root" ] || { echo "[contracts] Run inside a Git repository." >&2; exit 2; }
cd "$root" || exit 2

LOCK="contracts.lock"
DIR="src/contracts"

[ -f "$LOCK" ] || { echo "[contracts] Missing $LOCK."; exit 1; }
[ -d "$DIR" ]  || { echo "[contracts] Missing $DIR."; exit 1; }

expected_version="$(grep '^version=' "$LOCK" | head -1 | cut -d= -f2)"
actual_version="$(cat "$DIR/VERSION" 2>/dev/null)"
if [ "$expected_version" != "$actual_version" ]; then
  echo "[contracts] VERSION drift: lock says '$expected_version', vendored copy says '$actual_version'."
  exit 1
fi

failed=0
listed=""

while IFS= read -r line; do
  case "$line" in
    ''|\#*|version=*) continue ;;
  esac
  hash="$(printf '%s' "$line" | awk '{print $1}')"
  name="$(printf '%s' "$line" | awk '{print $2}')"
  [ -n "$hash" ] && [ -n "$name" ] || continue
  listed="$listed $name"

  if [ ! -f "$DIR/$name" ]; then
    echo "[contracts] MISSING: $DIR/$name is listed in the lock but absent."
    failed=1
    continue
  fi
  actual="$(sha256sum "$DIR/$name" | awk '{print $1}')"
  if [ "$actual" != "$hash" ]; then
    echo "[contracts] MODIFIED: $DIR/$name does not match contracts.lock."
    failed=1
  fi
done < "$LOCK"

# Fail closed on extra files too: an unlisted contract is unverified.
for f in "$DIR"/*.ts; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  case " $listed " in
    *" $base "*) ;;
    *) echo "[contracts] UNLISTED: $DIR/$base is not in contracts.lock."; failed=1 ;;
  esac
done

if [ "$failed" -ne 0 ]; then
  echo "[contracts] Vendored contracts differ from the lock."
  echo "[contracts] Contracts are owned by noktos-agent-backend and are read-only here."
  echo "[contracts] Re-sync is a human operation, never an agent edit."
  exit 1
fi

echo "[contracts] OK - vendored copy matches contracts.lock (version $actual_version)."
exit 0
