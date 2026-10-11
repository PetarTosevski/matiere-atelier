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
- **Layout**: sticky header band with the wordmark, navigation, language switcher and cart icon; menu button on small screens; footer with Instagram link, language switcher and copyright.
- **Languages**: locale-prefixed URLs (`/en/...`), all UI copy in `messages/en.json`. Only English for now.
- **Placeholder content**: 8 artworks in `src/data/artworks.ts` (one is an unpublished draft) with generated placeholder paintings in `public/placeholders/`.

## Getting started

Requires Node.js 22 or newer (developed on Node 24).

```bash
npm install
cp .env.example .env   # nothing is required yet for local development
npm run dev            # http://localhost:3000, redirects to /en/originals
```

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

### Phase 1 (storefront), still missing

- [ ] **Cart**: add pieces by ID (stored in the browser), "In cart" state, confirmation with "View cart" and "Continue browsing", live count in the header.
- [ ] **Cart cleanup on load**: drop pieces that are sold, unpublished or no longer priced, and tell the visitor which ones.
- [ ] **Cart page**: thumbnail, title, price, remove button, subtotal.
- [ ] **Checkout**: send an order inquiry with the cart contents, and explain that the artist will reply about payment and shipping.
- [ ] **Shared inquiry form**: Zod validation on the server, honeypot, per-IP rate limit, email to the artist via Nodemailer with reply-to set to the sender, clear success and error messages.
- [ ] **Request page** (`/request/[slug]`): the form under the piece's thumbnail and title.
- [ ] **Commissions page**: intro copy plus a form (description, approximate size, optional budget).
- [ ] **Contact page**: the contact form.
- [ ] **About page**: portrait and bio placeholders.
- [ ] Final Phase 1 review and click-through on mobile and desktop.

### Phase 2 (admin and database)

- [ ] Link-only admin area at `/admin` with server-side session checks on every page and action.
- [ ] Login from env credentials (bcrypt hash), iron-session cookie, rate-limited login, logout.
- [ ] Artwork list: edit, delete, mark sold or available, reorder.
- [ ] Upload and edit form: title, slug, images with alt text and reordering, markdown description with preview, price mode, status, published.
- [ ] Image processing with sharp: auto-rotate, strip metadata, resize, WebP; stored outside `public/` and served from `/media`.
- [ ] Global "Show prices" switch.
- [ ] Prisma + SQLite, seed from `src/data/artworks.ts`, inquiries stored as well as emailed.

### Decisions needed

- [ ] Email / SMTP provider (needed for the forms).
- [ ] Checkout: payment provider (for example Stripe Checkout) or inquiry-only. Taking payments also needs terms, a privacy policy, shipping info and the EU withdrawal rules.
- [ ] Hosting (SQLite and local uploads need a persistent disk).
- [ ] Languages besides English.
- [ ] HEIC photo handling for uploads.
- [ ] Whether "edit page layout" means more than reordering artworks.

### Content from the artist

- [ ] Real artwork photos, titles, descriptions and prices.
- [ ] About text and portrait, Commissions intro, Instagram URL.
- [ ] Final palette and typeface (placeholders in `src/app/tokens.css`).
