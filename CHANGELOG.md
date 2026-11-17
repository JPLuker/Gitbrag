# Changelog

## [1.0.0] — release candidate

### Added
- Public repository dashboards, customizable repository share links, PNG exports, embeds, and Chrome extension repository summaries.
- Unified activity-period dropdowns for GitHub profile statistics.

### Changed
- Removed incomplete sampled repository commit counts, calendars, and commit-history displays before release.
- Preserved existing profile activity statistics and legacy profile share links.
- Improved extension typography consistency on GitHub pages.

### Security and maintenance
- MIT licensing, local Inter font, CSP, support/security documentation, and automated release verification.
- Chrome Web Store submission is separate from the GitHub release.

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
