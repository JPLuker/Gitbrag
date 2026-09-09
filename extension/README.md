# Gitbrag for GitHub

A Manifest V3 Chrome extension that automatically adds a compact Gitbrag stats card to public GitHub profile pages.

**v0.9.3** is the pre-test hardening pass. It adds a settings popup, shared route/cache validation, loading and error states, retry support, request timeouts, stricter API validation, automatic cache pruning, and extra regression coverage before live GitHub placement testing.

## What it shows

- 7D, 1M, 6M, and 1Y contribution periods
- Contributions
- Active days
- Best day
- Longest streak
- Public repository count
- Followers
- Following
- Account age
- A direct link to the full Gitbrag profile

The extension uses public data only. It does not request a GitHub login or token.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extension` directory.
5. Open a public GitHub user profile such as `https://github.com/octocat`.

The Gitbrag card should load automatically in the profile layout.

The exact live GitHub placement has not yet been browser-verified. That is the main remaining test dependency.

## Extension popup

Clicking the extension toolbar action opens a small settings panel where users can:

- Enable or disable automatic Gitbrag cards.
- Choose the default contribution period.
- Clear locally cached public profiles.
- Open the main Gitbrag site.

Preferences are stored with Chrome sync storage when available. Cached profile data uses Chrome local storage.

## Architecture

- `manifest.json` — Manifest V3 configuration and minimal permissions.
- `core.js` — pure username/route validation, cache pruning, and contribution-response normalization shared by extension contexts.
- `background.js` — fetches/caches public GitHub profile and contribution data with request timeouts and graceful failure handling.
- `stats.js` — pure contribution-period calculations, separately testable from Chrome APIs.
- `content.js` — detects GitHub profile navigation, injects the Gitbrag card, handles settings, loading states, retries, and GitHub DOM replacement.
- `content.css` — isolated card styling that follows GitHub light/dark theme variables when available.
- `popup.html`, `popup.css`, `popup.js` — lightweight extension settings UI.
- `PRIVACY.md` — current privacy/data-use disclosure.
- `STORE_LISTING.md` — draft Chrome Web Store copy and permission rationale.

GitHub is SPA-like, so the content script watches Turbo/PJAX navigation, URL changes, and DOM replacement instead of assuming a full page reload.

## Permissions

The extension requests:

- `storage` — stores the user's extension preferences and caches recently viewed public profiles for 15 minutes.
- Host access to `api.github.com` — basic public user metadata.
- Host access to `github-contributions-api.jogruber.de` — public contribution history.

It does not request access to private repositories, account credentials, cookies, tabs, identity, or browsing history.

## Cache behavior

- Public profile responses are cached locally for up to 15 minutes.
- At most 50 profiles are retained.
- Expired entries are pruned automatically.
- The popup includes a manual Clear cached profiles action.
- Retry bypasses the current cache entry and requests fresh public data.

## Failure states

The extension keeps a visible card rather than silently disappearing when something goes wrong.

Handled states include:

- GitHub user not found.
- GitHub API rate limits.
- GitHub/network timeout.
- Invalid GitHub API response.
- Contribution service unavailable or malformed response.
- Extension background service communication failure.

If contribution history is unavailable but GitHub profile metadata succeeds, profile metadata still renders and contribution-dependent values show as unavailable.

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

The pure tests cover profile-route detection, invalid usernames, cache expiry/pruning, malformed contribution records, contribution-period calculations, streaks, and account age.

## Pre-test checklist completed

- Minimal permissions reviewed.
- Settings popup built.
- Loading shell built.
- Retry/error UI built.
- Cache expiry and manual cache clearing built.
- API request timeout added.
- Route detection moved into a testable module.
- Malformed contribution data rejected.
- DOM replacement reinjection guard added.
- Store listing draft written.
- Privacy disclosure draft written.

## Still requires real browser testing

- Confirm the preferred GitHub profile injection point on current desktop GitHub.
- Verify GitHub light and dark themes visually.
- Navigate between profiles without full reload and confirm the card follows correctly.
- Verify the extension does not appear on repositories, settings, organizations, or reserved GitHub routes.
- Confirm extension popup behavior in Chrome.
- Confirm rate-limit/network errors visually.
- Test narrow GitHub layouts where applicable.

## Chrome Web Store

The code/package structure is prepared for local testing and later store packaging. Store publication still needs final branding assets/icons and real screenshots from the browser-tested extension. Chrome recommends packaged icons including 16, 48, and 128 pixel sizes; those should be generated only after the final Gitbrag extension mark is chosen.
