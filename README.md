# Gitbrag

Gitbrag is a lightweight GitHub Pages app that turns public GitHub activity into a focused stats dashboard with share links, social PNGs, website embeds, and an optional Chrome extension.

**v0.9.7** adds calendar-based activity periods. In addition to rolling 24H/7D/1M/6M/1Y/all-time views, Gitbrag can now calculate a specific calendar month or year, including month-to-date and year-to-date labels for the current period. Dated periods flow through the dashboard, share links, embeds, and PNG generation.

## Current features

- Search by GitHub username or paste a `github.com/username` profile URL.
- Open a profile directly with a hash route such as `#/octocat`.
- Browse rolling contribution activity for 24H, 7D, 1M, 6M, 1Y, and all available history.
- Select a specific calendar month or calendar year from the **DATED** activity option.
- View contributions, active days, best day, longest streak, public repositories, repository stars, followers, following, and account age.
- View a contribution heatmap and ranked original public repositories.
- Build configurable responsive share links with a compact versioned URL token.
- Preserve dated month/year selections in share links and website embeds.
- Generate a dedicated 1080 × 1080 social PNG from an isolated Canvas 2D renderer.
- Customize PNG modules, period, calendar range, up to four repositories, text size, accent, and card style.
- Generate responsive website embed code from **Share → Embed**.
- Use the optional Manifest V3 Chrome extension to surface Gitbrag stats directly on public GitHub profile pages.
- Run the main website entirely as a static GitHub Pages app with no Gitbrag account backend or database.

## Landing page

The homepage is deliberately small and product-first:

- A Gitbrag hero with the primary GitHub username/profile-URL search.
- A short explanation of what Gitbrag does.
- An explicitly illustrative example dashboard preview so visitors can see the product before loading a profile.
- A restrained footer with project documentation plus creator links.
- Responsive desktop and mobile layouts.

The actual dashboard remains the primary place where users interact with Gitbrag's features.

## Activity periods

Gitbrag supports two kinds of stats periods.

### Rolling periods

- 24 hours
- 7 days
- 30 days
- 6 months
- 1 year
- All available contribution history

### Dated periods

Use **DATED** to choose an exact calendar period:

- A calendar month, such as **August 2026**
- A calendar year, such as **2025**

Historical calendar periods use their exact calendar boundaries. The current month/year is capped at today and labeled **Month to date** or **Year to date** so an incomplete period is not presented as final.

Dated stats use the same four calculations as rolling periods: contributions, active days, best day, and longest streak.

## Architecture

Gitbrag intentionally keeps its rendering paths separated:

- `index.html` — application structure, simplified landing page, profile views, and modal shells.
- `style.css` — core application/profile design system.
- `landing.css` — simplified landing-page presentation only.
- `landing.js` — lightweight landing-page visibility state used to hide the floating version badge while the landing page is active.
- `dated.css` — dated-period picker styling.
- `stats-period.js` — pure rolling/calendar-period parsing, labeling, date-window calculation, and record filtering.
- `dated-period.js` — dated-period UI integration for the dashboard and existing share/PNG period selectors.
- `share-config.js` — versioned configuration schema, normalization, validation, compact encoding, and legacy decoding.
- `share-page.js` — responsive shared-webpage renderer and builder UI.
- `embed.js` — embed URL/code generation and iframe auto-height behavior.
- `png.css` — PNG-builder interface styling only.
- `png.js` — isolated fixed 1080 × 1080 Canvas renderer and export flow.
- `app.js` — routing, public-data loading, calculations, main profile rendering, and renderer-neutral view models.
- `extension/` — optional Manifest V3 Chrome extension and its own tests/documentation.

### Renderer boundary

The responsive share page and website embed use normal HTML. The PNG generator draws directly to its fixed 1080 × 1080 canvas. The PNG path does not clone, screenshot, or reuse the responsive shared-page DOM.

The Chrome extension is also independent of the website renderers. It injects its own compact card into GitHub and shares no DOM renderer with the site.

## Share links

New links use a compact route:

```text
https://example.github.io/Gitbrag/#/octocat?s=<token>
```

The configuration can control:

- Profile section
- Stats section
- Contribution calendar
- Repository section
- Rolling or dated stats period
- Calendar range
- Up to four featured repositories
- Text size
- Accent
- Card style

Share-config schema v2 adds dated stats-period values while continuing to decode v1 compact and JSON tokens. Malformed or unsupported compact tokens fall back safely instead of breaking the app.

## PNG generation

PNG output is intentionally fixed to:

```text
1080 × 1080
1:1
PNG
```

The visible preview is the same canvas that is exported. The layout adapts to enabled sections, stats period, calendar range, and repository count. Contribution days are packed into a dense square-cell matrix for the social image, while the normal responsive webpage keeps its conventional calendar renderer.

Generated PNGs use a single enlarged Gitbrag wordmark in the top-right and retain the GitHub profile URL in the footer.

## Website embeds

The embed builder is available from **Share → Embed**. Embed URLs use the same compact configuration plus an embed flag:

```text
#/octocat?s=<token>&embed=1
```

The generated iframe can work by itself or with the included auto-height helper. The helper accepts resize messages only from the generated iframe and expected Gitbrag origin.

## Chrome extension

The optional extension lives in `extension/` and uses Manifest V3.

It currently supports:

- Automatic public-profile detection on GitHub.
- 7D, 1M, 6M, and 1Y contribution views.
- Contributions, active days, best day, longest streak, public repos, followers, following, and account age.
- A toolbar popup for enable/disable, default period, and cache clearing.
- Local short-lived caching to reduce public API traffic.
- Explicit loading, timeout, rate-limit, partial-data, retry, and malformed-response handling.

The extension does not request a GitHub token, private-repository access, cookies, tabs, identity, or browsing-history permissions.

To test locally:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the repository's `extension` directory.
5. Open a public GitHub profile.

## Data sources

Basic profile and repository information comes from the public GitHub REST API. Gitbrag requests up to three repository pages of 100 repositories each for the full web dashboard and excludes forks from repository rankings/star aggregation.

Contribution history comes from `github-contributions-api.jogruber.de` and follows GitHub's public contribution graph. If contribution history cannot be loaded, Gitbrag keeps profile/repository data visible and marks contribution-dependent output unavailable rather than converting the failure to zero.

Because Gitbrag does not request a GitHub token, GitHub's unauthenticated API limits apply.

## Tests

```bash
node tests/stats-period.test.js
node tests/share-config.test.js
node extension/tests/core.test.js
node extension/tests/stats.test.js

node --check stats-period.js
node --check dated-period.js
node --check app.js
node --check share-page.js
node --check share-config.js
node --check embed.js
node --check png.js
node --check landing.js
node --check extension/core.js
node --check extension/background.js
node --check extension/stats.js
node --check extension/content.js
node --check extension/popup.js
```

## Run locally

No build step is required:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Canvas 2D API
- Chrome Extensions Manifest V3
- GitHub REST API
- Public GitHub contribution data
- GitHub Pages

## Roadmap to 1.0

- **0.6** — versioned share-config foundation
- **0.7** — responsive custom-link sharing
- **0.8** — isolated 1:1 PNG generator and compact share URLs
- **0.9** — social feature hardening and regression fixes
- **0.9.1** — configurable website embeds
- **0.9.2** — first-party Chrome extension
- **0.9.3** — extension pre-test hardening and store/privacy preparation
- **0.9.4 / 0.9.4.1** — PNG branding and rounded-corner cleanup
- **0.9.5** — full marketing landing page
- **0.9.6** — simplified launch landing page and creator/project footer
- **0.9.7** — dated calendar-month/year stats across dashboard, shares, embeds, and PNGs
- **1.0** — final regression, documentation freeze, and stable release
