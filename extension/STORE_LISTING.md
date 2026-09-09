# Chrome Web Store draft

## Name

Gitbrag for GitHub

## Short description

See recent GitHub contribution stats directly on public GitHub profile pages.

## Detailed description

Gitbrag for GitHub adds a compact Gitbrag stats panel to public GitHub profiles. Switch between 7-day, 1-month, 6-month, and 1-year contribution windows without leaving GitHub.

The card shows contributions, active days, best day, longest streak, public repository count, followers, following, and account age, with a direct link to the full Gitbrag dashboard.

The extension uses public data only. No GitHub login or access token is required.

Features:

- Automatic Gitbrag card on public GitHub profile pages
- 7D, 1M, 6M, and 1Y contribution summaries
- Public profile statistics
- GitHub light/dark theme-aware styling
- Local 15-minute cache to reduce repeated API requests
- Enable/disable control and default-period setting
- Direct access to the full Gitbrag profile

## Permission rationale

### storage

Used for a short-lived local cache of public profile data and the user's extension preferences.

### https://api.github.com/*

Used to retrieve basic public GitHub profile metadata.

### https://github-contributions-api.jogruber.de/*

Used to retrieve public GitHub contribution history.

The extension does not request tabs, history, cookies, identity, private repository, or broad arbitrary-site permissions.

## Store assets still requiring browser testing / final branding

- 128 × 128 product icon
- 16/32/48 icons for packaged extension polish
- At least one Chrome Web Store screenshot
- Final screenshot showing the actual card placement on GitHub
- Optional promotional images

Do not create store screenshots until the live GitHub placement and responsive behavior have been tested.
