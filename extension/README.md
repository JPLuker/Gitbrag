# Gitbrag for GitHub

A Manifest V3 Chrome extension that automatically adds a compact Gitbrag stats card to public GitHub profile pages.

## What it shows

- 7D, 1M, 6M, and 1Y contribution periods
- Contributions
- Active days
- Best day
- Longest streak
- Public repository count
- Followers
- Account age
- A direct link to the full Gitbrag profile

The extension uses public data only. It does not request a GitHub login or token.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extension` directory.
5. Open a public GitHub user profile such as `https://github.com/octocat`.

The Gitbrag card loads automatically in the profile layout.

## Architecture

- `manifest.json` — Manifest V3 configuration and minimal permissions.
- `background.js` — fetches/caches public GitHub profile and contribution data.
- `stats.js` — pure contribution-period calculations, separately testable from Chrome APIs.
- `content.js` — detects GitHub profile navigation and injects the Gitbrag card.
- `content.css` — isolated card styling that follows GitHub light/dark theme variables when available.

GitHub is SPA-like, so the content script watches Turbo/PJAX navigation and URL changes instead of assuming a full page reload.

## Permissions

The extension requests:

- `storage` — caches recently viewed profiles for 15 minutes to reduce API traffic.
- Host access to `api.github.com` — basic public user metadata.
- Host access to `github-contributions-api.jogruber.de` — public contribution history.

It does not request access to private repositories, account credentials, cookies, tabs, or browsing history.

## Rate limits and failures

GitHub's unauthenticated REST API limits still apply. Recent profile results are cached locally to reduce repeated requests. If the contribution service is unavailable, the profile metadata still renders and contribution-dependent values show as unavailable.

## Tests

```bash
node tests/stats.test.js
node --check background.js
node --check stats.js
node --check content.js
```

## Chrome Web Store

This directory is ready for local unpacked testing. Store publication still needs final branding assets/icons, screenshots, listing copy, privacy disclosures, and the Chrome Web Store submission process.
