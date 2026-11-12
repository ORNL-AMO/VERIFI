#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

DESKTOP_MAC_SOURCE=$1
APPS=("$DESKTOP_MAC_SOURCE"/output/mac-universal/*.app)
DMGS=("$DESKTOP_MAC_SOURCE"/output/*.dmg)
ZIPS=("$DESKTOP_MAC_SOURCE"/output/*.zip)
[[ ${#APPS[@]} -eq 1 && ${#DMGS[@]} -eq 1 && ${#ZIPS[@]} -eq 1 ]]
NOTARIZATION_LOG="$RUNNER_TEMP/desktop-notarization.json"
show_notary_failure() {
    if [[ $1 -ne 0 && -f "$NOTARIZATION_LOG" ]]; then cat "$NOTARIZATION_LOG" >&2; fi
}
trap 'show_notary_failure "$?"' EXIT

EXECUTABLE=$(plutil -extract CFBundleExecutable raw -o - "${APPS[0]}/Contents/Info.plist")
lipo -verify_arch x86_64 arm64 "${APPS[0]}/Contents/MacOS/$EXECUTABLE"
codesign --verify --deep --strict --verbose=2 "${APPS[0]}"
codesign -dv --verbose=4 "${APPS[0]}" 2> "$RUNNER_TEMP/desktop-codesign.txt"
grep -q '^Authority=Developer ID Application:' "$RUNNER_TEMP/desktop-codesign.txt"
grep -Fqx "TeamIdentifier=$APPLE_TEAM_ID" "$RUNNER_TEMP/desktop-codesign.txt"

xcrun notarytool submit "${DMGS[0]}" --wait --apple-id "$APPLE_ID" --password "$APPLE_APP_SECRET" --team-id "$APPLE_TEAM_ID" --output-format json > "$NOTARIZATION_LOG"
node -e 'const result=JSON.parse(require("fs").readFileSync(process.argv[1])); if(result.status!=="Accepted") { console.error("Notarization:",result.status); process.exit(1); }' "$NOTARIZATION_LOG"

# The DMG submission notarizes its contained app as well. Staple both identities;
# ZIP containers cannot carry a ticket, so rebuild the ZIP around the stapled app.
xcrun stapler staple "${APPS[0]}"
xcrun stapler validate "${APPS[0]}"
codesign --verify --deep --strict --verbose=2 "${APPS[0]}"
ditto -c -k --sequesterRsrc --keepParent "${APPS[0]}" "$RUNNER_TEMP/desktop-stapled.zip"
mv "$RUNNER_TEMP/desktop-stapled.zip" "${ZIPS[0]}"
xcrun stapler staple "${DMGS[0]}"
xcrun stapler validate "${DMGS[0]}"
echo '{"platform":"mac","verified":true,"signature":true,"universal":true,"notarization":"Accepted","stapling":{"app":true,"dmg":true,"zip":true}}' > "$DESKTOP_MAC_SOURCE/desktop-verification.json"
