# Site craft

The website is where Garage is judged. It must look like a small, expensive studio designed it for this one business, never like a template or an AI site. Treat it as the most important thing you make.

## 1. Art direction first (design.md)

Before writing any HTML, write `design.md` in the workspace root (not in site/). Keep it under 25 lines:

- **Concept:** one sentence. The idea the whole site hangs on, taken from the business itself. A grooming van: "a calm spa that drives to you." A plumber: "the pipe under everything."
- **Signature:** the one element only this business could have, described concretely. It is visual or interactive and comes from the product, the place or the name. Examples of the level we want (don't reuse them): a camera company's photo hero that dissolves into pixels as you scroll; a garage door that rolls up to reveal the product working; a bakery's hero loaf whose crust browns as you scroll; a plumber's single pipe line that draws itself down the page, joining the sections; a bookkeeper's ledger grid where the numbers tally into place; a tutor's chalkboard where the headline is handwritten stroke by stroke.
- **Archetype:** pick one and commit: editorial magazine, poster, field guide, catalog, product tour, letterpress/print, ledger, zine, museum placard, tech spec sheet, menu, map. The archetype decides the grid, the type and the details.
- **Type:** the families and why (see 3).
- **Color:** the ground, the ink, one accent, and where the dark band goes.
- **Sections:** the order, with one line each on its layout. No two adjacent sections may use the same layout.
- **Motion:** the one or two moments that move, and why.

## 2. Copy (write this before styling)

- Headlines are plain, concrete statements of the outcome in the customer's words, 3 to 9 words. "Know which cow to check today." "One box on a post. A text when she changes." "Straight answers." Never a slogan made of abstractions.
- One idea per sentence. Short sentences. Real specifics: places, times, prices, quantities, materials, steps.
- Numbers come from research.md with a footnote marker and a source note at the bottom. Estimates say "about" or "estimate".
- Banned words: unlock, elevate, seamless, empower, transform, revolutionize, cutting-edge, game-changer, next-level, effortless, supercharge, leverage, robust, innovative, solutions, "Welcome to", "Get started today", "Look no further", "In today's fast-paced world".
- CTAs say exactly what happens: "Join the waitlist", "Book a curbside slot", "Ask for a quote". Use one primary action across the page.

## 3. Typography

- One excellent family can carry a whole site; a second, contrasting face is only for accents (a serif italic word in a sans headline, a mono for numbers). Never three.
- Display type is big and tight: hero `clamp(3rem, 8vw, 6.5rem)`, section heads `clamp(2.25rem, 4.8vw, 3.75rem)`, letter-spacing -0.03em to -0.045em, line-height 1.0 to 1.1. Headlines usually weight 500 to 600, not 800. Body 17 to 19px, line-height 1.55, never under 15px, max ~65 characters a line.
- Use `text-wrap: balance` on headlines and `font-variant-numeric: tabular-nums` on figures.
- Choose fonts that fit the archetype, from families with real character, such as Fraunces, Instrument Serif, Newsreader, Young Serif, Gloock, DM Serif Display, Bricolage Grotesque, Schibsted Grotesk, Hanken Grotesk, Familjen Grotesk, Geist, Onest, Archivo, Syne, Unbounded, Space Mono, IBM Plex Mono, Caveat (handwriting accents only).
- Avoid the AI defaults unless the concept truly calls for them: Inter alone, Poppins, Montserrat, Roboto, Open Sans, Lato, Plus Jakarta Sans, Playfair Display, Space Grotesk.

## 4. Color and surface

- Grounds are tinted, not pure white: a paper, a stone, a cream, a fog. Ink is near-black with a hint of the palette.
- One accent, used sparingly: the primary button, a highlighted word, the signature element.
- Build rhythm with bands: ground, alternate ground, and at least one full dark band (or one full accent band) somewhere in the middle.
- Atmosphere is allowed when it serves the concept: a soft gradient sky, film grain (an inline SVG feTurbulence), a paper texture, a dot grid. Never a generic purple-to-blue gradient, never random blurred blobs.
- Shadows are soft and large, or none. Corner radius is consistent and chosen for the archetype (print and ledger: 0 to 4px; friendly products: 14 to 28px).

## 5. Layout

- Max width about 1180px with generous gutters; section padding 96 to 140px on desktop, 64 to 88px on phones.
- Asymmetry over centering: text on one side, the visual on the other; a large number set against a short caption; a sticky column next to a scrolling one. Center only the hero or the final call to action, if at all.
- Vary the section shapes: a full-bleed band, a split, a bento grid of unequal cards, a numbered timeline, a single huge statement, a table, an FAQ. The "three equal cards with an icon" row may appear at most once, and only if nothing better fits.
- Show the real thing: the product, the menu, the price list, the van, the route, the before and after, a sample report. Build it in HTML and CSS or SVG instead of describing it.

## 6. Imagery

- No stock photos, no emoji, no clip-art icon sets. Draw what you need as inline SVG in the brand palette: a hero illustration with real detail (layers, highlights, a ground shadow, a few small story details), consistent line icons with one stroke width, maps, diagrams, patterns.
- CSS and canvas can make the signature: shapes that assemble, a texture that reacts to scroll, type that draws in.
- Every image has a purpose and alt text; decorative ones get `alt=""` or `aria-hidden`.

## 7. Motion

- One or two meaningful moments, usually the signature plus gentle reveal-on-scroll (IntersectionObserver adding a class; opacity and a 16 to 28px rise; 0.6 to 0.9s; slight stagger).
- Hover states on every interactive element. Navigation that turns into frosted glass after scrolling is welcome.
- `@media (prefers-reduced-motion: reduce)` shows everything in its final state.
- Content must be visible without JavaScript running: start revealed elements visible and let JS add the hidden state on load.

## 8. Build quality

- One self-contained `site/index.html` (inline CSS and JS, Google Fonts link). Extra SVG files in site/ are fine.
- Semantic landmarks, one h1, skip-friendly headings, visible focus styles, contrast at least 4.5:1 for text.
- Fluid from 360 to 1600px; no horizontal scroll on phones; tap targets of at least 44px.
- `<title>`, meta description, Open Graph title and description, theme-color, and the logo as an SVG favicon.
- No frameworks or JS libraries. No fake testimonials, ratings, logos, counts or awards.

## 9. Look at it, then make it better

After writing the site, call `look_at_site` for `desktop`, then `mobile`, and an `overview` to judge the rhythm of the whole page. Pass an `anchor` (a section id) to look further down. Judge honestly:

1. Within five seconds, does the hero say what this is, for whom, and what to do?
2. Is the signature there, and does it feel like it belongs to this business only?
3. Is there clear type hierarchy (hero at least 3x body), tight display tracking, and no orphaned single words in headlines?
4. Do the sections alternate in shape and band, or is it a stack of look-alike card rows?
5. Is anything cramped, misaligned, overflowing or empty on the phone?
6. Would a designer call any part a template or AI slop? Name it.

Fix the biggest problems by editing, then look again. Do at least one round of fixes and at most three. Stop when you'd be proud to put it in a portfolio.

## 10. Every business gets its own

Never reuse another site's concept, signature, font pairing or palette family. If the owner's note lists what other businesses in this Garage already use, pick something clearly different. Two Garage sites side by side should look like they came from different studios.
