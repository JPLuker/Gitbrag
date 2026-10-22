# Gitbrag

Read open GitHub issues first. Issue #1 tracks the 1.0 release gate.
Work on `main`; do not touch other projects. Keep features frozen for 1.0.
Run `python3 scripts/verify.py` before committing. `VERSION` is the source
of truth; run `python3 scripts/sync-version.py` after changing it.
Never mark a browser test complete based on source inspection or CI.

## Deviations

Joseph explicitly approved retaining Gitbrag's existing visual identity on
2026-10-22. No Aurora Glass conversion, landing-page redesign, desktop Settings
screen, light-mode expansion, or decorative version overlay is required.
The extension follows GitHub's native theme. Accessibility remains a release
gate; a style exception does not waive keyboard, contrast or readable text checks.

This is a static GitHub Pages website and optional Manifest V3 extension.
Keep the current root-based Pages layout and existing routes. No native
installers, desktop data directories, elevation, signing or custom updater apply.
The browser manages website caches and extension installation/update/removal.
Do not add a backend, account system, telemetry, or framework.

The product's core purpose is looking up public online GitHub data. Offline
live statistics are inapplicable. GitHub API, contribution-service and public
avatar requests are essential product data, rather than third-party decoration;
disclose them accurately. Fonts/scripts must remain bundled. The extension's
installation is consent to its disclosed automatic profile lookups, which the
popup can disable. Do not claim that public lookups never leave the device.

No durable user-authored documents or database exist. Public data cache can be
cleared; extension preferences can be removed by uninstalling. Website URLs
and PNG downloads are the existing export formats. Do not add desktop-style
export/data-folder controls merely to match a desktop checklist.

The license is not yet confirmed. Do not invent a license or publish 1.0 before
Joseph confirms it. Preserve the bundled font's SIL Open Font License notice.

## Release scope

Automated checks and a draft release do not establish real-browser acceptance.
Use FINAL-TEST.md and MAINTENANCE-AUDIT.md. Chrome Web Store publication is a
separate distribution task: icons, screenshots and store review are not proof
of website/extension runtime correctness and must not be silently claimed done.
