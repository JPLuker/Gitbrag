# Gitbrag for GitHub

A Manifest V3 Chrome extension that adds a compact Gitbrag overlay to public GitHub profile pages.

**v0.9.8** is the pre-1.0 website-parity pass. The overlay now mirrors the core Gitbrag experience while staying compact enough to live inside GitHub.

## What it shows

- Current calendar month by default.
- Previous/next calendar-month navigation.
- Calendar month/year selection.
- Rolling 24H, 7D, 30D, 60D, 6M, 1Y, and All Time periods.
- Contributions, active days, best day, and longest streak.
- A contribution heatmap using the same selected period.
- Public repository count, loaded-repository stars, followers, following, and account age.
- Top three original public repositories ranked by stars.
- A direct **Open in Gitbrag** link for the full dashboard/share/PNG/embed experience.

The extension uses public data only. It does not request a GitHub login or token.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extension` directory.
5. Open a public GitHub user profile such as `https://github.com/octocat`.

The Gitbrag overlay should load automatically in the profile layout.

## Extension popup

The toolbar popup lets users:

- Enable or disable the Gitbrag overlay.
- Choose the default activity period (Current month, 24H, 7D, 30D, 60D, 6M, 1Y, or All Time).
- Clear locally cached public profiles.
- Open the full Gitbrag site.

Preferences use Chrome sync storage when available. Cached profile data uses Chrome local storage.

## Architecture

- `manifest.json` — Manifest V3 configuration and minimal permissions.
- `core.js` — username/route validation, cache pruning, and contribution-response normalization.
- `background.js` — fetches/caches public GitHub profile, repository, and contribution data; repository loading matches the website's three-page owner/non-fork rules.
- `stats.js` — calendar/rolling period parsing, filtering, summaries, heatmap windows, month navigation, and account-age calculations.
- `content.js` — GitHub profile detection, overlay rendering, compact period picker, SPA/Turbo reinjection, retries, and partial-data states.
- `content.css` — isolated overlay styling using GitHub theme variables where available.
- `popup.html`, `popup.css`, `popup.js` — extension settings UI.
- `PRIVACY.md` — privacy/data-use disclosure.
- `STORE_LISTING.md` — draft Chrome Web Store copy and permission rationale.

The extension does not reuse the website DOM renderer. It deliberately mirrors the website's information model and period behavior in a GitHub-native overlay.

## Permissions

The extension requests:

- `storage` — stores preferences and caches recently viewed public profiles for 15 minutes.
- `https://api.github.com/*` — public profile and repository metadata.
- `https://github-contributions-api.jogruber.de/*` — public contribution history.

It does not request private repository access, account credentials, cookies, tabs, identity, or browsing history.

## Cache behavior

- Public profile responses are cached locally for up to 15 minutes.
- At most 50 profiles are retained.
- Expired entries are pruned automatically.
- The popup includes **Clear cached profiles**.
- Retry bypasses the current cache entry and requests fresh public data.

## Failure states

The overlay stays visible rather than silently disappearing when something goes wrong. If contribution history fails but GitHub metadata succeeds, the profile summary/repositories remain visible and contribution-dependent output is marked unavailable.

Handled states include user-not-found, GitHub rate limits, request timeout/network failure, malformed API data, contribution-service failure, and background-service communication failure.

## Tests

```bash
node tests/core.test.js
node tests/stats.test.js
node --check core.js
node --check background.js
node --check stats.js
node --check content.js
node --check popup.js
```

The pure tests cover route validation, cache behavior, contribution normalization, current-month/calendar-year windows, 60D rolling ranges, summaries, heatmap windows, month stepping, and account age.

## Still requires real-browser testing

See the repository-level `FINAL-TEST.md`. The release gate includes current GitHub placement, light/dark themes, period-picker interaction, heatmap sizing, repository parity, SPA navigation/reinjection, popup behavior, and visible failure states.
