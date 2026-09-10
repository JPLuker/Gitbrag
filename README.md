# Gitbrag

Gitbrag is a lightweight GitHub Pages app that turns public GitHub activity into a focused stats dashboard with share links, social PNGs, website embeds, and an optional Chrome extension.

**v0.9.5** adds the full marketing landing page. The homepage now presents Gitbrag as a finished product rather than a single search box, while keeping username/profile-URL search as the primary action.

## Current features

- Search by GitHub username or paste a `github.com/username` profile URL.
- Open a profile directly with a hash route such as `#/octocat`.
- Browse contribution activity for 24H, 7D, 1M, 6M, 1Y, and all available history.
- View contributions, active days, best day, longest streak, public repositories, repository stars, followers, following, and account age.
- View a contribution heatmap and ranked original public repositories.
- Build configurable responsive share links with a compact versioned URL token.
- Generate a dedicated 1080 × 1080 social PNG from an isolated Canvas 2D renderer.
- Customize PNG modules, period, calendar range, up to four repositories, text size, accent, and card style.
- Generate responsive website embed code from **Share → Embed**.
- Use the optional Manifest V3 Chrome extension to surface Gitbrag stats directly on public GitHub profile pages.
- Run the main website entirely as a static GitHub Pages app with no Gitbrag account backend or database.

## v0.9.5 landing page

The homepage now includes:

- A full-width dark marketing layout with large editorial hero typography.
- A working GitHub username/profile-URL field in the hero.
- An illustrative Gitbrag dashboard composition that makes the product visible immediately.
- Factual product proof blocks: six activity ranges, 1080 × 1080 PNG output, up to four featured social repositories, and zero Gitbrag accounts required.
- Dedicated sections for the dashboard, custom share links, PNG generation, website embeds, and Chrome extension.
- A public-data/static-architecture trust section.
- A second working username/profile-URL CTA near the bottom of the page.
- A structured product/project footer.
- Responsive desktop, tablet, and mobile layouts.

The page is influenced by the pacing of the supplied stats.fm reference screenshots—dark full-width sections, prominent product visuals, alternating feature storytelling, quantitative proof, and a strong final CTA—while retaining Gitbrag's own blue/black visual system and original copy.

The marketing page intentionally does **not** invent user counts, generated-profile counts, or activity totals. Numeric marketing claims describe actual product capabilities.

## Architecture

Gitbrag intentionally keeps its rendering paths separated:

- `index.html` — application structure, marketing homepage, profile views, and modal shells.
- `style.css` — core application/profile design system.
- `landing.css` — v0.9.5 marketing homepage presentation only.
- `landing.js` — lightweight landing-page interactions and the secondary CTA bridge into the existing search flow.
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
- Stats period
- Calendar range
- Up to four featured repositories
- Text size
- Accent
- Card style

Legacy v1 `?share=` tokens remain decodable. Malformed or unsupported compact tokens fall back safely instead of breaking the app.

## PNG generation

PNG output is intentionally fixed to:

```text
1080 × 1080
1:1
PNG
```

The visible preview is the same canvas that is exported. The layout adapts to enabled sections, calendar range, and repository count. Contribution days are packed into a dense square-cell matrix for the social image, while the normal responsive webpage keeps its conventional calendar renderer.

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
node tests/share-config.test.js
node extension/tests/core.test.js
node extension/tests/stats.test.js

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
- **1.0** — final regression, documentation freeze, and stable release
