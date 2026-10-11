# Matière Atelier

An online storefront for a painter selling her original artworks. It is deliberately simple and artwork-first: large images, quiet interface, no accounts or search.

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, next-intl 4, Zod and Convex (database and file storage). Tests run on Vitest. Project rules, structure and open decisions live in [CLAUDE.md](CLAUDE.md).

## What it does today

- **Originals** (`/en/originals`): a 3-column grid (2 on small screens) of published artworks. Every cover sits in the same portrait frame and is never cropped. Each card shows title, dimensions, price and availability; pieces with a second photo swap to it (ideally a texture close-up) on hover.
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
cp .env.example .env   # set CONVEX_SERVER_SECRET (any long random string); SMTP_PASS for real email

# Terminal 1: a local Convex backend (no account needed; data stays on this machine)
CONVEX_AGENT_MODE=anonymous npx convex dev
npx convex env set CONVEX_SERVER_SECRET "<same value as in .env>"   # once
npm run db:seed        # once: imports the placeholder artworks and images

# Terminal 2
npm run dev            # http://localhost:3000, redirects to /en/originals
```

**Email.** Inquiries are sent through the artist's Google Workspace mailbox via Gmail SMTP. Put a Google app password (Google Account > Security > App passwords) in `SMTP_PASS`. Until it is set, development writes each email to `.outbox/` as an `.eml` file you can open in any mail app; a production build refuses to send instead.

Before a real deploy, set `NEXT_PUBLIC_SITE_URL` to the public URL, because it is baked into Open Graph image links at build time.

**Admin.** The admin area is at `/admin` and is not linked from the site. To set the login, run `npm run hash-password`, type a password (at least 12 characters, hidden as you type) and paste the printed `ADMIN_PASSWORD_HASH=...` line into `.env`, along with `ADMIN_USERNAME` and a `SESSION_SECRET` of at least 32 random characters. Restart `npm run dev` after changing `.env`.

**Convex.** All data and uploaded images live in Convex. Next.js only talks to it from the server, and every Convex function requires `CONVEX_SERVER_SECRET`, so hidden prices and drafts can't be fetched from the browser. Without Convex configured, development falls back to `src/data`. To move from the local backend to a cloud project: `npx convex login`, `npx convex dev --configure`, set the secret there, then `npm run db:seed`.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # next typegen && tsc --noEmit
npm run test       # Vitest: unit tests and price-hiding render tests
npx convex dev     # Convex: push schema and functions on save
npm run db:seed    # import src/data/artworks.ts and its images into Convex (-- --reset to start over)
npm run hash-password  # print an ADMIN_PASSWORD_HASH line for .env
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

- [x] Link-only admin area at `/admin` with server-side session checks on every page, action and route; noindex header.
- [x] Login from env credentials (bcrypt hash), iron-session cookie, rate-limited login, logout.
- [x] Artwork list: edit, delete (with confirmation), mark sold or available, reorder.
- [x] Upload and edit form: title, generated slug, images with alt text and reordering, markdown description with live preview, price mode, status, published.
- [x] Image processing with sharp: auto-rotate, strip metadata, resize to 2560 px, WebP; stored in Convex file storage.
- [x] Global "Show prices" switch.
- [x] Dimensions field (width × height in cm) shown on the grid and artwork page; hover close-up from the second image.
- [x] About page editor at `/admin/about`: portrait (with alt text) and bio, with the same formatting toolbar and preview.
- [x] Formatting toolbar on the description (with Ctrl/Cmd+B, I, K).
- [x] "Preview page" in the form (with unsaved changes) and on the artwork list (the live order, handy while reordering). Clicking a piece in the preview opens its artwork page there.
- [x] Set your own admin password (`npm run hash-password`).
- [x] Convex database: schema, secret-guarded functions, seed from `src/data/artworks.ts`, storefront reading from it.
- [x] Inquiries stored as well as emailed; form rate limits stored in Convex.
- [ ] Link a Convex cloud project (Free or Starter) and seed it.

### Decisions

- [x] Wordmark spelling: "Matière" on the site.
- [x] Email: the artist's Google Workspace mailbox via Gmail SMTP with an app password.
- [x] Git hosting: private GitHub repository.
- [x] Database and file storage: Convex (Free or Starter plan).
- [ ] Hosting for the Next.js app. Convex removes the database constraint; Vercel Hobby is non-commercial only, so the candidates are Netlify, Cloudflare Workers or a small VPS.
- [x] HEIC photo handling: rejected with a message asking for JPEG, PNG or WebP.
- [x] Currency on the upload form: EUR only for now.
- [x] "Edit page layout": reordering artworks plus editing the About page.
- [ ] Whether other page text (such as the Commissions intro) should become editable too.
- [ ] Whether the admin gets a page to read stored inquiries.
- [ ] Defaults to confirm: a single admin login, redirects from old slugs, a documented backup step, no draft preview.
- [ ] Checkout: payment provider (for example Stripe Checkout) or inquiry-only. Taking payments also needs terms, a privacy policy, shipping info and the EU withdrawal rules.
- [ ] Languages besides English.

### Content from the artist

- [ ] Real artwork photos, titles, descriptions and prices.
- [ ] About text and portrait (she can now add these herself in the admin), Commissions intro, Instagram URL.
- [ ] Final palette and typeface (placeholders in `src/app/tokens.css`).
