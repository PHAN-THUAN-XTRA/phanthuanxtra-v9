# PHAN THUẦN XTRA APK — Automation Checkpoint

Date: 2026-09-18
Branch: chore/apk-canonical-ci-2026-09-18

## Canonical CI path
- Canonical Android workflow: `.github/workflows/android-apk.yml`.
- Duplicate Gate 11 workflows were removed from the automation path.
- CI gates: production App API health → AI contract regression → Gradle 8.9 / Java 17 build → APK existence → SHA-256 → artifact upload.
- Direct GitHub Release publication remains available from the canonical workflow under its existing Gate 11 publish condition.
- Production Worker deployment remains GitHub Actions → Cloudflare API/SDK; Wrangler is not used.

## Physical-device gate
CI cannot prove behavior on the Samsung Galaxy S21 Ultra. The physical-device regression remains an explicit final evidence gate and must be run from the S21 Ultra (Termux/browser) after a verified APK artifact is available.

## Operating protocol
After every APK PR: verify CI → merge only when green → re-audit main across APK/API/Worker/automation → record evidence → continue to the next smallest verified change.

## Current evidence
Latest main commit observed: `f7f7e42ef2572ed1b617cd89ab1757419a9e93e5` (PR #271 merge).