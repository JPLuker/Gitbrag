# Gitbrag — Final Manual Test Gate for 1.0

This file contains checks that require a real browser, live GitHub behavior, visual inspection, or failure-state simulation before Gitbrag can be tagged **v1.0.0**. Automated/static checks should be run first. Do not mark an item complete unless it was actually tested.

## 1. Landing page

- [ ] Desktop: hero copy, search field, example dashboard preview, and footer look intentional.
- [ ] Desktop: hero heading has no overlapping letters at common widths.
- [ ] Mobile 320–430 px: no horizontal page overflow, clipped search controls, or unusable footer links.
- [ ] Search works with a username and `github.com/username` URL.

## 2. Default profile period — v0.9.7.2

- [ ] Opening a normal profile defaults to **Month** mode and the current calendar month.
- [ ] Current-month stats are month-to-date, not rolling 30-day stats.
- [ ] The contribution calendar displays that same current calendar month.
- [ ] The selected period is shown once as context; the calendar heading does not duplicate the same month/year label.
- [ ] Navigating to a second user also defaults that profile to the current month.
- [ ] Back / New user and re-opening a profile do not leave stale Month/Year/Rolling UI state.

## 3. Month / Year / Rolling controls

- [ ] **Month** exposes compact Month + Year selectors and updates immediately.
- [ ] A historical month such as August 2026 uses exactly August 1–31.
- [ ] The current month is correctly labeled month-to-date.
- [ ] **Year** exposes a Year selector and hides the Month selector.
- [ ] A historical year uses January 1–December 31.
- [ ] The current year is correctly labeled year-to-date.
- [ ] **Rolling** exposes 24H, 7D, 30D, 60D, 6M, 1Y, and All Time.
- [ ] Each rolling choice updates both stats and the contribution calendar to the same period.
- [ ] Switching repeatedly between Month, Year, and Rolling does not leave stale highlighted buttons or stale calendar cells.

## 4. Contribution calculations

For at least one profile with known activity, spot-check against GitHub/public contribution data:

- [ ] Contributions total.
- [ ] Active days.
- [ ] Best day.
- [ ] Longest streak.
- [ ] Historical month totals do not include adjacent-month days used only for calendar-grid alignment.
- [ ] 30D and 60D produce distinct expected date windows.
- [ ] All Time still works.

## 5. Share links

- [ ] Open **Share → Share link** from the default current-month profile.
- [ ] Builder starts with the current calendar month selected.
- [ ] Specific Month/Year controls are compact and usable on mobile.
- [ ] There is no competing visible Calendar Range setting; stats and calendar use the same period.
- [ ] Copy a current-month link, open it in a fresh/private tab, and verify the exact period survives.
- [ ] Repeat with a historical month.
- [ ] Repeat with a calendar year.
- [ ] Repeat with 60D rolling.
- [ ] Existing pre-v0.9.7 v1 share links still decode without breaking the page.
- [ ] Malformed/unsupported tokens fall back safely to the full profile.

## 6. Shared-page visual output

- [ ] A dated shared page displays the selected period once rather than repeating it beside both Activity Summary and Contribution Calendar.
- [ ] Current month/year partial labels remain understandable.
- [ ] Calendar cells fit at phone, tablet, and desktop widths.
- [ ] Repositories, profile, and disabled-section combinations still lay out correctly.

## 7. PNG generator

- [ ] Open **Share → Generate image** from the default current-month profile.
- [ ] PNG builder starts on the current month.
- [ ] Month/Year picker controls are usable on a phone-sized viewport.
- [ ] Rolling 60D can be selected.
- [ ] Calendar follows the same selected period as stats.
- [ ] Dated PNG shows the month/year once; there is no duplicate period label above the calendar.
- [ ] Preview matches the downloaded 1080 × 1080 PNG.
- [ ] Download works with Profile/Stats/Calendar/Repositories individually disabled in representative combinations.
- [ ] Avatar load failure still produces a usable fallback image.

## 8. Embeds

- [ ] Generate an embed for current month, a historical month, a year, and 60D rolling.
- [ ] Period survives in the embed URL/config.
- [ ] Embedded stats and contribution calendar use the same selected period.
- [ ] Auto-height helper still resizes correctly.
- [ ] Resize messages remain restricted to the expected iframe/origin.

## 9. General profile regression

- [ ] Direct `#/username` route works.
- [ ] New user/back navigation works.
- [ ] Nonexistent users display the error state.
- [ ] GitHub rate-limit state is understandable.
- [ ] Contribution-service failure keeps profile/repository data visible and marks contribution-dependent data unavailable rather than showing zero.
- [ ] Repository links, GitHub profile link, share menu, and dialogs all remain usable with keyboard navigation.

## 10. Browser/device pass

Test at minimum where available:

- [ ] Chromium desktop (Chrome or Brave).
- [ ] Firefox desktop.
- [ ] Safari/WebKit or an iPhone browser.
- [ ] Android Chromium/Brave.
- [ ] 320 px width.
- [ ] ~390–430 px width.
- [ ] Tablet width.
- [ ] Desktop width.

Pay particular attention to native `<select>` behavior, modal scrolling, horizontal overflow, and the Month/Year/Rolling controls.

## 11. Chrome extension

The extension remains intentionally separate from the website period redesign.

- [ ] Load unpacked successfully.
- [ ] Public GitHub profile detection works.
- [ ] Existing 7D / 1M / 6M / 1Y extension periods still work.
- [ ] Popup enable/disable and cache clearing work.
- [ ] Loading, timeout, rate-limit, partial-data, and retry states remain usable.
- [ ] No new extension permissions were introduced by website-only changes.

## 12. Final 1.0 release gate

Before tagging v1.0.0:

- [ ] Run all Node tests and `node --check` commands documented in README.
- [ ] Confirm no stale `0.9.x` cache refs or visible version labels remain after the 1.0 bump.
- [ ] Confirm README matches actual behavior.
- [ ] Confirm extension privacy documentation is accurate.
- [ ] Confirm production GitHub Pages deploy succeeds.
- [ ] Perform one final production smoke test of dashboard, share link, PNG, and embed.
- [ ] Tag/release only after the above manual checks are complete.
