## 0.9.11 — repository mode candidate (unreleased)

- Add public repository dashboards, sampled commit calendar, share link, 1080×1080 PNG, and embed code.
- Add GitHub repository summary overlay in the Chrome extension, reusing the existing cache and navigation detection.
- Remove month-step arrows from the website dashboard, PNG period selector, and extension in favor of dropdown controls.
- Preserve profile routes and existing profile share tokens; pending browser regression and extension over-install tests.

# Changelog

## [Unreleased]

## [0.9.10] — 2026-10-22

### Added
- Licensed Gitbrag as open source under MIT, with license notices on the website and in the extension.

## [0.9.9] — 2026-10-22

### Changed
- Bundled Inter locally so loading the site no longer contacts Google Fonts.
- Added direct bug-report and security links without redesigning the site.
- Documented public-data requests, extension storage, support, and the remaining 1.0 gates.

### Security
- Restricted website scripts, fonts, API connections and images with a Content Security Policy.
- Disabled outbound referrer headers from the website.

## Earlier versions

The README roadmap and Git history record the pre-0.9.9 changes. This changelog
does not invent release dates or claim that earlier builds completed testing.
