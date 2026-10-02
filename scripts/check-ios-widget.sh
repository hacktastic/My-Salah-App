#!/usr/bin/env bash
# Runs ios/App/SalahStreakWidgetChecks on macOS. The widget target has no XCTest target, and this
# check needs no simulator. It runs once for each calendar, because the device calendar must not
# change the widget dates.
set -euo pipefail
cd "$(dirname "$0")/.."

widget=ios/App/SalahStreakWidget
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

xcrun swiftc -o "$out/check" \
  "$widget/WidgetSnapshot.swift" \
  "$widget/SalahText.swift" \
  ios/App/SalahStreakWidgetChecks/main.swift

for locale in en_US "ar_SA@calendar=islamic-umalqura" "th_TH@calendar=buddhist" "ja_JP@calendar=japanese"; do
  echo "== $locale"
  "$out/check" -AppleLocale "$locale"
done
