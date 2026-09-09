# Gitbrag v0.9.5 landing-page direction

This document records the visual/product direction for the marketing homepage before implementation.

## Reference takeaways

The supplied stats.fm screenshots establish the desired class of presentation without copying its branding or page content:

- Dark, high-contrast page with clearly separated full-width sections.
- Large editorial hero typography with one strong accent color.
- Product UI shown prominently in the hero instead of relying on abstract illustration.
- Alternating feature sections that combine concise copy with large product screenshots/mockups.
- Quantitative proof presented as oversized numbers where real metrics are available.
- Strong final CTA block before a structured footer.
- Mobile layout that keeps the product showcase visually dominant rather than collapsing into a text-only landing page.

## Gitbrag-specific interpretation

Gitbrag should feel related to the existing app rather than like a separate marketing site. Keep the current near-black background, blue/profile-derived accent language, rounded cards, Inter/system typography, and restrained Gitbrag branding.

### Hero

- Compact top navigation with GITBRAG branding, a link to the GitHub repository, and a primary action.
- Original headline centered on GitHub activity and identity. Avoid copying stats.fm wording.
- Username/profile-URL input remains the primary CTA and should work directly from the hero.
- Large real Gitbrag dashboard composition below or beside the headline. Use actual product screenshots once the final UI is stable.
- Secondary links may point to the Chrome extension and source repository.

### Product proof section

Use factual product capabilities instead of invented user/usage counts. Candidate number blocks:

- 6 activity ranges: 24H, 7D, 1M, 6M, 1Y, all time.
- 1080 × 1080 social PNG output.
- Up to 4 featured repositories in social output.
- 0 accounts required.

Do not display fake totals for users, profiles generated, or GitHub activity.

### Feature storytelling

Use several large alternating feature panels, inspired by the pacing of the supplied reference:

1. **See the work at a glance** — dashboard, contribution stats, streaks, repository summary.
2. **Share it your way** — custom share links and module controls.
3. **Turn it into an image** — 1:1 PNG builder with configurable sections and appearance.
4. **Put it on your site** — responsive website embeds.
5. **Bring Gitbrag into GitHub** — Chrome extension card shown inside a real GitHub profile after browser testing.

Each section should have one strong heading, a short explanation, and a real product visual rather than a long feature list.

### Trust / data section

Gitbrag has a useful differentiator that should be visible before the final CTA:

- Public GitHub data only.
- No Gitbrag account required.
- No GitHub token required for the web app or current extension design.
- Contribution-service failures are represented as unavailable rather than fake zeroes.
- Static GitHub Pages architecture for the main web app.

Do not overstate privacy guarantees beyond the actual implementation.

### Final CTA

Use a large accent-colored or high-contrast panel with the username input again and a direct Generate Gitbrag action. This should echo the visual prominence of the final CTA in the reference while remaining distinctly Gitbrag.

### Footer

Suggested groups:

- Gitbrag: Home, Generate stats, GitHub source.
- Features: Share links, PNG, Embed, Chrome extension.
- Project: README / documentation, privacy information where applicable.

Keep the footer compact on mobile.

## Responsive rules

- No fixed-width product visuals that cause horizontal page scrolling.
- Hero product screenshot may intentionally extend close to viewport edges on mobile.
- Feature panels become a single column below tablet widths.
- Large display type must use `clamp()` rather than hard breakpoints alone.
- Final CTA input/button stacks vertically on narrow screens.
- Preserve generous vertical pacing; do not compress the page into a dashboard-style information wall.

## Implementation timing

Build this in v0.9.5 after the extension's real GitHub placement is tested. The extension section should use an actual screenshot from the working extension, not a fabricated representation.
