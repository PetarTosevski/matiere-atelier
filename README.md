# Matière Atelier

An online storefront for a painter selling her original artworks. It is deliberately simple and artwork-first: large images, quiet interface, no accounts or search.

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, next-intl 4 and Zod. Tests run on Vitest. Project rules, structure and open decisions live in [CLAUDE.md](CLAUDE.md).

## What it does today

- **Originals** (`/en/originals`): a 3-column grid (2 on small screens) of published artworks. Every cover sits in the same portrait frame and is never cropped. Each card shows title, price and availability.
- **Artwork page** (`/en/originals/[slug]`): large uncropped image with thumbnails, a full-screen viewer (fit to screen or actual size, drag to pan, keyboard support), then title, price, availability, the primary action and the markdown description. Unknown or draft slugs return 404.
- **Price rules** in one place (`src/lib/pricing.ts`):
  - Priced and available: price shown, "Add to cart".
  - Priced and sold: price shown, "Sold out", "Request this piece".
  - Display mode (and Auction, which renders the same): no price, "Ask about this piece".
  - Showcase mode (`showPrices: false` in `src/data/settings.ts`): every price, the cart icon and all "Add to cart" buttons disappear.
  - A hidden price is never sent to the browser at all: not in the HTML, the data passed to client components, or the Open Graph tags. Tests check this.
- **Cart**: "Add to cart" stores only the artwork ID in the browser, then the button reads "In cart" with "View cart" and "Continue browsing". The header shows a live count. On every load the server re-checks the cart and drops pieces that sold, were unpublished or lost their price, telling the visitor which ones. `/cart` lists each piece with its price, a remove button and the subtotal.
- **Checkout**: no online payment yet. "Send order request" emails the artist the pieces (priced again on the server) so she can reply about payment and shipping.
- **Forms**: one shared form behind Contact, Commissions, Request (`/request/[slug]`) and Checkout. Server-side Zod validation, a hidden honeypot field, a per-IP rate limit (5 per 10 minutes), plain-language errors, and an email to the artist with reply-to set to the visitor.
- **Layout**: sticky header band with the wordmark, navigation, language switcher and cart icon; menu button on small screens; footer with Instagram link, language switcher and copyright.
- **Languages**: locale-prefixed URLs (`/en/...`), all UI copy in `messages/en.json`. Only English for now.
- **Placeholder content**: 8 artworks in `src/data/artworks.ts` (one is an unpublished draft) with generated placeholder paintings in `public/placeholders/`.

## Getting started

Requires Node.js 22 or newer (developed on Node 24).

```bash
npm install
cp .env.example .env   # fill in SMTP_PASS to send real email (see below)
npm run dev            # http://localhost:3000, redirects to /en/originals
```

**Email.** Inquiries are sent through the artist's Google Workspace mailbox via Gmail SMTP. Put a Google app password (Google Account > Security > App passwords) in `SMTP_PASS`. Until it is set, development writes each email to `.outbox/` as an `.eml` file you can open in any mail app; a production build refuses to send instead.

Before a real deploy, set `NEXT_PUBLIC_SITE_URL` to the public URL, because it is baked into Open Graph image links at build time.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # next typegen && tsc --noEmit
npm run test       # Vitest: unit tests and price-hiding render tests
```

Run `lint`, `typecheck` and `test` before considering a change done.

## Useful to know

- **Showcase mode**: set `showPrices: false` in `src/data/settings.ts`.
- **Logo**: drop a `public/logo.svg` in to replace the text wordmark.
- **Design tokens** (colors, widths, menu text size, header clearance) are all in `src/app/tokens.css`.
- **Replaced an image but still see the old one?** Next.js caches optimized images per file name. Delete `.next/dev/cache/images` (and `.next/cache/images` for production builds), then hard-refresh the browser.

## To do

### Phase 1 (storefront)

- [x] Cart: IDs in the browser, "In cart" state, confirmation, live header count
- [x] Cart cleanup on load, with a notice naming what was removed
- [x] Cart page: thumbnail, title, price, remove, subtotal
- [x] Checkout as an order inquiry
- [x] Shared inquiry form: Zod, honeypot, rate limit, Nodemailer, reply-to
- [x] Request, Commissions, Contact pages with their forms; About with placeholders
- [ ] Add the Gmail app password to `.env` and send one real test email
- [ ] Final Phase 1 review and click-through on mobile and desktop

### Phase 2 (admin and database)

- [ ] Link-only admin area at `/admin` with server-side session checks on every page and action.
- [ ] Login from env credentials (bcrypt hash), iron-session cookie, rate-limited login, logout.
- [ ] Artwork list: edit, delete, mark sold or available, reorder.
- [ ] Upload and edit form: title, slug, images with alt text and reordering, markdown description with preview, price mode, status, published.
- [ ] Image processing with sharp: auto-rotate, strip metadata, resize, WebP; stored outside `public/` and served from `/media`.
- [ ] Global "Show prices" switch.
- [ ] Prisma + SQLite, seed from `src/data/artworks.ts`, inquiries stored as well as emailed.

### Decisions

- [x] Wordmark spelling: "Matière" on the site.
- [x] Email: the artist's Google Workspace mailbox via Gmail SMTP with an app password.
- [x] Git hosting: private GitHub repository.
- [ ] Hosting. Blocks Phase 2: SQLite and local uploads need a persistent disk; serverless hosting would need a hosted database, object storage and a shared rate-limit store.
- [ ] HEIC photo handling for uploads: convert on the server, or reject and ask for JPEG.
- [ ] Currency on the upload form: EUR only for now, or a currency select.
- [ ] Whether "edit page layout" means more than reordering artworks (for example editing the About or Commissions text).
- [ ] Whether the admin gets a page to read stored inquiries.
- [ ] Defaults to confirm: a single admin login, redirects from old slugs, a documented backup step, no draft preview.
- [ ] Checkout: payment provider (for example Stripe Checkout) or inquiry-only. Taking payments also needs terms, a privacy policy, shipping info and the EU withdrawal rules.
- [ ] Languages besides English.

### Content from the artist

- [ ] Real artwork photos, titles, descriptions and prices.
- [ ] About text and portrait, Commissions intro, Instagram URL.
- [ ] Final palette and typeface (placeholders in `src/app/tokens.css`).
