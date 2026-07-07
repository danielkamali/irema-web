# IREMA — Design System

**Product:** IREMA — honest, verified reviews for Rwandan businesses.
**Design language:** Dark teal & white. Bold hero blocks, crisp data lists, and a conversational "bubble-chat" review format (the chosen direction).
**Surfaces:** Mobile app · Desktop web · Installable PWA · Business dashboard.
**Modes:** Every screen exists in both light and dark.

Source files (all `.dc.html`, open directly in browser):
- `IREMA Teal & White.dc.html` — original palette/system exploration
- `IREMA Redesign - Directions.dc.html` — early direction options
- `IREMA App.dc.html` — canonical system doc: foundations, 8 review-format kit, mobile/web/dashboard screens
- `IREMA Flow.dc.html` — full journey in bubble-chat format, ordered by device (mobile → desktop web → PWA)
- `IREMA - Every Page.dc.html` — every page of the product (29 screens) rebuilt in the bubble-chat system, mobile+desktop, light+dark
- `Phase 1 - Public.dc.html` — reverse-engineered public/guest page inventory from the live app (irema-41070.web.app)

---

## 1. Color

### Light theme
| Token | Hex | Use |
|---|---|---|
| `bg` | `#F4F6F5` | Page background |
| `surf` | `#FFFFFF` | Cards, bubbles, sheets |
| `surf2` | `#FAFBFB` | Secondary surface |
| `ink` | `#0C2C26` | Primary text |
| `ink2` | `#4F625C` | Secondary text |
| `mut` | `#8A9B96` | Muted / meta text |
| `bd` | `#E4EBE8` | Border |
| `bd2` | `#EEF2F0` | Faint divider |
| `ac` (accent) | `#0E8C73` | Teal accent — links, stars, active states |
| `acDeep` | `#0A5E4D` | Deep teal — emphasis text on light |
| `acSoft` | `#E3F3ED` | Accent tint background (pills, soft fills) |
| `hero` | `#0E8C73` | Hero block background |
| `heroTx` | `#FFFFFF` | Text on hero |
| `heroMut` | `#BFE6DA` | Muted text on hero |
| `btn` (primary button) | `#0C2C26` | Primary CTA fill |
| `btnTx` | `#FFFFFF` | Primary CTA text |
| `chip` | `#EEF3F1` | Neutral chip fill |
| `star` | `#0E8C73` | Star rating fill |

### Dark theme
| Token | Hex | Use |
|---|---|---|
| `bg` | `#06110E` | Page background ("Night") |
| `surf` | `#0F1F1B` | Cards, bubbles, sheets |
| `surf2` | `#0C1A16` | Secondary surface |
| `ink` | `#ECF4F1` | Primary text |
| `ink2` | `#A6BBB4` | Secondary text |
| `mut` | `#6A7F79` | Muted / meta text |
| `bd` | `#1E2F2A` | Border |
| `bd2` | `#172521` | Faint divider |
| `ac` | `#27B996` | Teal accent (brighter for dark bg) |
| `acDeep` | `#1C9577` | Deep teal |
| `acSoft` | `#10271F` | Accent tint background |
| `hero` | `#0C5A49` | Hero block background |
| `heroTx` | `#EAF6F2` | Text on hero |
| `heroMut` | `#8FCBBC` | Muted text on hero |
| `btn` | `#27B996` | Primary CTA fill |
| `btnTx` | `#06231C` | Primary CTA text |
| `chip` | `#13241F` | Neutral chip fill |
| `star` | `#27B996` | Star rating fill |

**Foundational swatches** (from the palette block): Teal `#0E8C73` · Deep `#0A5E4D` · Ink `#0C2C26` · Soft `#E3F3ED` · Mist `#F4F6F5` · Night `#06110E`.

Rule of thumb: **one accent hue (teal)** carries the whole product; light/dark swap which end of the teal ramp is "loud" vs. "soft." Never introduce a second brand color — use the teal ramp + ink/mist neutrals only.

---

## 2. Typography

Loaded via Google Fonts: `Space Grotesk` (400–700), `Figtree` (400–900), `Newsreader` (italic, opsz 6–72, 400/500), `JetBrains Mono` (400–600).

| Font | Role |
|---|---|
| **Space Grotesk** | Display — headlines, scores, wordmark ("irema"), big numbers |
| **Figtree** | Interface & body — default `body` font, all UI text |
| **Newsreader** (italic) | Editorial — pull quotes, testimonial-style reviews |
| **JetBrains Mono** | Meta — timestamps, category tags, small caps labels, business handles |

Helper constants used throughout the code: `F_DISP`, `F_SER`, `F_MONO` (Figtree is the implicit default, set once on `body`).

Type scale is set per-context rather than a fixed ramp — headlines run 24–48px display weight 700 with tight letter-spacing (`-.02em` to `-.03em`); body copy 12.5–15px; meta/mono labels 8–11px, often uppercase with `.05–.12em` letter-spacing.

---

## 3. Review format kit (core building block)

IREMA's product is reviews, so the review card is the most important component. Eight interchangeable formats exist (see `IREMA App.dc.html`, section 02), all theme-aware:

1. **bubble** — single hand-drawn speech bubble, thick 2.5px teal border, offset hard shadow, small tail SVG, Newsreader italic quote
2. **bubbleChat** — ⭐ *the chosen direction* — a two-message conversation: reviewer bubble (left, rounded 6/22/22/22, surf background) + business reply bubble (right, rounded 22/6/22/22, solid accent fill, white text, "OWNER" tag)
3. **bold** — card with solid hero-colored header band, big score avatar, "TOP PICK" tag
4. **quote** — oversized serif quotation mark + italic Newsreader pull-quote + rating
5. **social** — feed-style row list, mono meta line
6. **row** — compact list row, score chip + name + meta chevron
7. **photo** — image-led card, gradient photo placeholder, floating rating badge
8. **breakdown** — big average score + horizontal bar histogram of 5→1 star distribution

**Bubble-chat is the production format** — used everywhere reviews appear in `IREMA Flow.dc.html` and `IREMA - Every Page.dc.html`, extended with:
- **Photos**: a `photoRow`/`photoStrip` of 1–3 gradient image placeholders appended under the review text
- **Expandable owner reply**: a tappable pill ("Business replied · tap to view") that toggles the reply bubble open/closed (`window.__irToggleReply`)
- **Verified/helpful signals**: small mono meta line, helpful-point pill on the post-success screen

---

## 4. Components

- **Buttons**: primary = filled `btn`/`btnTx`, bold weight, 12–14px radius; ghost = 1.5px border, transparent fill, `ink2` text. Full-width on mobile, intrinsic width on desktop.
- **Chips/pills**: rounded-999px, filled accent when active, outlined neutral when inactive (category filters, interest picker, tag selectors).
- **Fields (auth/forms)**: label above, bordered input container (`surf` bg, `bd`/`ac` border), optional leading icon, optional `+250` phone prefix in mono, focus state = accent border + blinking-caret indicator.
- **Avatars**: initials in a rounded-square or circle, `ink` bg / `surf` text (or accent-tinted).
- **Stars**: filled/outline glyphs in `star` color; also a "blocks" variant (5 rounded squares) for compact score displays.
- **App bar**: wordmark + status dot, back chevron, right-aligned action/icon.
- **Tab bar** (mobile): Home · Search · central Plus (write) · Alerts · You.
- **Nav bar** (web): logo, primary links, search, auth actions.
- **Cards**: 14–20px radius, 1px `bd` border, soft shadow on light, no shadow (border only) on dark.
- **Status/system chrome**: mobile status bar (9:41 time), browser window chrome (traffic-light dots + URL bar), desktop window / PWA installed chrome (no URL bar, "INSTALLED · STANDALONE" tag).

---

## 5. Layout patterns

- **Mobile**: 375×~760px phone frame, rounded-corner bezel, status bar, scrollable content, fixed tab bar.
- **Desktop web**: full nav bar, wide hero split-panel layouts (copy left / form or content right), grid card layouts (2–4 columns depending on breakpoint), modal overlays for write-review (dim scrim + centered card).
- **PWA**: same layouts as desktop/mobile web but chrome-less — install prompt shown as a native-style popover anchored to a fake omnibox "Install" affordance; installed state strips the URL bar entirely and shows only traffic lights + app name + "INSTALLED · STANDALONE" tag.
- **Business dashboard**: left sidebar nav (Overview/Reviews/Analytics/QR/Profile), top KPI stat cards, bar-chart trend panel, "latest reviews" list with inline reply composer.
- Canvas docs use `position:absolute` sections with a shared 64px left margin and generous vertical spacing; screens are grouped into labeled sections (e.g. "Foundations," "Review format kit," journey-ordered tracks).

---

## 6. Voice & content

- Rwanda-specific: local names (Aline U., Jean P., Eric N.), RWF pricing, `+250` phone format, Kinyarwanda touches ("Murakoze cyane" — thank you very much).
- Copy is short, confident, low-hype: *"Honest reviews. Zero noise."* is the core tagline.
- Review text reads like real, specific feedback — not generic praise.

---

## 7. Product page inventory (29 pages)

Grouped by journey, each built mobile+desktop, light+dark:

**Discover** — Homepage · Categories · Search results · Top Rated · Business Profile
**Write & review** — Write a Review (rating/tags/text/photos) · Review Posted
**Account** — Profile · Saved · Notifications · Settings
**Get started** — Onboarding · Log in · Sign up · Verify number · Auth Action
**Content & support** — Blog · Blog Article · About · Contact · Newsletter · QR Scanner
**Legal & errors** — Terms of Service · Privacy Policy · 404
**For business** — For Business landing/pricing · Register/Claim · Business Dashboard · Reviews Inbox
**Installable PWA** — Browser install prompt · Installed desktop window · Installed phone home-screen

---

## 8. Engineering notes (for continuing this system)

- Every doc is a single self-contained Design Component (`.dc.html`) — inline styles only, no external CSS files.
- Theme is a plain JS object (`T.light` / `T.dark`) of token → hex; every screen-builder function takes `(t, theme)` or `(t, breakpoint, theme)` and reads from `t.*` — never hardcodes color.
- Custom elements (`<app-phone>`, `<web-frame>`, `<dash-frame>`, `<rev-card>`, `<pg-row>`, `<pwa-*>`) wrap device chrome around a screen-builder's HTML string, registered once via a `mk(tag, fn)` helper.
- To add a new screen: write a builder function returning an HTML string using existing helpers (`appbar`, `navbar`, `field`, `bigBtn`, `reviewBubble`, `chip`, `av`, `stars`, `icon`), add it to the relevant `*_SCREENS`/`PAGES` map, then reference it from a `<...-row>`/frame element in the template.
