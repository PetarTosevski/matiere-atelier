# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Matière Atelier** is an online storefront for a painter selling her original artworks. The client asked for something simple and artwork-first.

Structural reference (match its calm layout, not its branding):
- Collection grid: https://fae-8008.myshopify.com/collections/original-artworks
- Artwork page: https://fae-8008.myshopify.com/products/kopie-first-tracks

The site name lives in one constant (`SITE_NAME = "Matière Atelier"` in `src/lib/site.ts`). Everywhere on the site it is written "Matière"; only the repo and package name stay `matiere-atelier`.

Work happens in phases. Finish and verify a phase before starting the next. Do not build anything under "Later" unless asked.

- **Phase 1 (V1 storefront):** Originals, artwork pages, request page, Commissions, About, Contact, cart, language switcher. Artwork data comes from a typed file.
  - Status: the skeleton is built (layout, Originals grid, artwork page with full-screen viewer, language switcher). Still to do: cart logic (the header count is a static 0 and "Add to cart" does nothing yet), forms, and real content for Commissions, About, Contact, Cart and Request, which are stub pages for now.
- **Phase 2 (Admin + database):** link-only admin area, upload and edit artworks, price modes, global "Show prices" switch.

## Tech stack

- Next.js (App Router, latest stable) with TypeScript in strict mode
- Tailwind CSS, with design tokens defined once as CSS variables
- next-intl for UI translations, using locale-prefixed routes (`/en/originals`)
- Zod for validating every form and server action input
- react-markdown + remark-gfm + rehype-sanitize for artwork descriptions (raw HTML disabled)
- Nodemailer (SMTP) for form emails
- Phase 2: Prisma + SQLite, sharp for images, iron-session for the admin session, bcrypt for the password hash

Ask before adding dependencies not listed here. Check current docs for conventions that change between framework versions (for example, recent Next.js versions rename `middleware.ts` to `proxy.ts`). The docs for the installed Next.js version ship in `node_modules/next/dist/docs/` (see AGENTS.md, which `next dev` maintains).

Installed: Next.js 16, React 19, next-intl 4, Tailwind CSS 4 (tokens in `src/app/tokens.css`), Zod 4, Vitest 5 (dev only, for tests).

## Commands

Create these scripts during setup and keep this list current:

```bash
npm run dev            # local dev server
npm run build          # production build
npm run lint           # eslint (next lint no longer exists)
npm run typecheck      # next typegen && tsc --noEmit (typegen creates the PageProps/LayoutProps route types)
npm run start          # serve the production build
npm run test           # vitest run: unit tests and price-hiding render tests
npm run db:migrate     # Phase 2: prisma migrate dev
npm run db:seed        # Phase 2: imports src/data/artworks.ts into the database
npm run hash-password  # Phase 2: prints a value for ADMIN_PASSWORD_HASH
```

Run `lint`, `typecheck` and `test` before calling any task done.

To preview showcase mode locally, set `showPrices: false` in `src/data/settings.ts`.

## Structure

```
src/
  proxy.ts                        next-intl locale redirects (Next 16 name for middleware)
  global.d.ts                     types next-intl locales and message keys from en.json
  i18n/
    routing.ts                    locales list (only "en" for now)
    navigation.ts                 locale-aware Link, redirect, usePathname
    request.ts                    loads messages/<locale>.json
    locale.ts                     toLocale(): validates the [locale] param
  app/
    layout.tsx                    pass-through root layout (imports globals.css)
    not-found.tsx                 404 for requests outside the locale routes
    globals.css                   base styles and small utilities
    tokens.css                    design tokens: the one file to change for palette and type
    [locale]/
      layout.tsx                  <html>, header, footer (cart provider later)
      page.tsx                    redirects to /[locale]/originals
      not-found.tsx               404 inside the site layout
      [...rest]/page.tsx          sends unknown paths to not-found
      originals/page.tsx          collection grid
      originals/[slug]/page.tsx   artwork page
      request/[slug]/page.tsx     request a piece
      commissions/page.tsx
      about/page.tsx
      contact/page.tsx
      cart/page.tsx
    admin/                        Phase 2. Not localized, never linked from the site
      login/page.tsx
      page.tsx                    artwork list: edit, reorder, delete
      artworks/new/page.tsx       upload
      artworks/[id]/page.tsx      edit
      settings/page.tsx           "Show prices" switch
    media/[...path]/route.ts      Phase 2. Serves uploaded images
  components/
  lib/
    types.ts        the data model below
    site.ts         SITE_NAME, INSTAGRAM_URL
    artworks.ts     data access. Pages read artworks ONLY through this module
    pricing.ts      getPriceView(), isCartEnabled(): the single source of price and stock display rules
    format.ts       formatPrice()
    settings.ts     site settings (showPrices)
    metadata.ts     artwork page metadata (never contains a price)
    markdown.ts     plain-text excerpts of descriptions
    mail.ts
    auth.ts         Phase 2
  data/
    artworks.ts     Phase 1 artwork data
    settings.ts     Phase 1 site settings
messages/
  en.json
public/
  placeholders/     generated placeholder paintings, until real photos arrive
prisma/
  schema.prisma     Phase 2
```

`lib/artworks.ts` exposes the same functions in both phases (`getPublishedArtworks()`, `getArtworkBySlug()`, and so on). Phase 2 swaps the static file for Prisma inside this module without touching pages.

## Data model

Use this shape from day one, even while data is static, so Phase 2 is a storage swap and not a rewrite.

```ts
type PriceMode = "PRICE" | "AUCTION" | "DISPLAY";
type Status = "AVAILABLE" | "SOLD";

type ArtworkImage = { src: string; width: number; height: number; alt: string };

type Artwork = {
  id: string;
  slug: string;               // unique, generated from title, editable
  title: string;
  description: string;        // markdown
  priceMode: PriceMode;
  priceAmount: number | null; // integer minor units (cents)
  currency: string;           // ISO 4217, default "EUR"
  status: Status;
  published: boolean;         // drafts never appear on the storefront
  sortOrder: number;          // controls order on Originals
  images: ArtworkImage[];     // first image is the cover
  createdAt: string;
};

type SiteSettings = { showPrices: boolean };

type InquiryType = "CONTACT" | "COMMISSION" | "REQUEST" | "ORDER";
```

Rules:
- Money is stored as integer minor units plus a currency code. Never use floats for money.
- Changing `priceMode` never clears `priceAmount`, so switching back to Price restores the old price.
- `AUCTION` is not selectable yet. If it ever appears in data, render it exactly like `DISPLAY`.

## Price and stock display rules

Every component that shows a price, availability, or buy action gets it from `getPriceView(artwork, settings)`. No component decides this on its own.

| Condition | Price | Availability | Primary action |
|---|---|---|---|
| `showPrices` is off (showcase mode) | hidden | shown | "Ask about this piece" (request page) |
| `priceMode` is DISPLAY or AUCTION | hidden | shown | "Ask about this piece" (request page) |
| PRICE and AVAILABLE | shown | "Available" | "Add to cart" |
| PRICE and SOLD | shown | "Sold out" | "Request this piece" (request page) |

- **Hidden means not rendered on the server.** A hidden price must not appear in the HTML, client component props, JSON-LD, or Open Graph tags. Do not hide prices with CSS `display: none`, because the value would still be readable in the page source.
- **The global switch never writes to artworks.** `showPrices` is a separate setting that overrides display only. Turning it off hides every price; turning it back on restores each piece's own mode automatically. Never implement it by bulk-updating `priceMode`.
- In showcase mode the cart icon and all "Add to cart" buttons are hidden.
- Prices are formatted with `Intl.NumberFormat` using the active locale and `currencyDisplay: "narrowSymbol"`, so EUR always shows the € symbol. Whole amounts drop the decimals.

## Phase 1: storefront

### Layout
- Header: wordmark (links to Originals), nav (Originals, Commissions, About, Contact), language switcher, cart icon with item count. On small screens the nav collapses into a menu.
- Footer: Instagram link (URL from config, placeholder for now), language switcher, copyright line.
- No search and no customer accounts.

### Originals (`/originals`)
- Grid of published artworks: 2 columns on small screens, 3 on desktop.
- Each card: cover image, then title, price, and availability below it. The whole card links to the artwork page.
- Ordered by `sortOrder`, then newest first.
- Empty state with a short line pointing to Commissions or Contact.

### Artwork page (`/originals/[slug]`)
- Desktop: images left, details right. Mobile: stacked.
- Large image that is never cropped. Clicking it opens a full-screen view so visitors can see texture. If there are several images, show thumbnails.
- Details: title, price, availability, primary action (from `getPriceView`), then the rendered markdown description.
- Unknown or unpublished slugs return 404.
- Metadata: page title, description excerpt, cover image as Open Graph image. Follow the price hiding rules.

### Request page (`/request/[slug]`)
- Same layout as Contact, with the piece's thumbnail and title shown read-only above the form.
- Fields: name, email, message. Sends a `REQUEST` inquiry that includes the artwork title and link.

### Commissions, About, Contact
- Commissions: intro copy (placeholder until the artist provides text) and a form with name, email, description of the desired piece, approximate size, and an optional budget. Sends a `COMMISSION` inquiry.
- About: portrait and bio placeholders.
- Contact: name, email, message. Sends a `CONTACT` inquiry.

### Forms
- One shared `InquiryForm` component, configured by `InquiryType`.
- Server action validates with Zod, includes a honeypot field and a simple per-IP rate limit, then emails `MAIL_TO` with reply-to set to the sender.
- Clear success and error states written in plain language.

### Cart
- Each original is unique: quantity is always 1 and there is no quantity selector. Once added, the button changes to "In cart".
- After adding, show a small confirmation with "View cart" and "Continue browsing".
- The cart stores artwork IDs only (in localStorage). Prices and availability always come from the server.
- On load, the cart drops any item that is sold, unpublished, or no longer priced, and tells the visitor which one was removed.
- `/cart` lists thumbnail, title, price, and a remove button, plus the subtotal.
- Checkout: no payment provider in V1 (see Open decisions). Until one is chosen, "Checkout" sends an `ORDER` inquiry with the cart contents, and the page explains that the artist will reply to arrange payment and shipping.

### Languages
- Every UI string lives in `messages/<locale>.json`. No hard-coded copy in components.
- Default locale is `en`. Additional locales are an open decision.
- The language switcher keeps the visitor on the same page.
- Artwork titles and descriptions are single-language in V1.

## Phase 2: admin and database

### Access
- The admin area lives at `/admin` and is never linked from the site, never added to the sitemap, and not listed in `robots.txt` (listing it would advertise it). Admin responses send `X-Robots-Tag: noindex`.
- Being unlinked is not security. Every admin page, server action, and route handler checks the session on the server. A middleware/proxy check alone is not enough.
- Credentials come from env: `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`. The plaintext password is never stored. `npm run hash-password` prints the hash with each `$` escaped as `\$`, because Next.js expands `$` in `.env` files.
- Session: iron-session cookie, `httpOnly`, `secure`, `sameSite: "lax"`, 7-day expiry. Include a logout button.
- Login is rate limited (5 attempts per 15 minutes per IP).

### Artwork list (`/admin`)
- All artworks including drafts: cover, title, price mode, price, status, published.
- Actions: edit, delete (with confirmation), mark sold or available, reorder.
- Reordering sets `sortOrder` and is how the artist controls the Originals layout. This is the current interpretation of "edit her page layout"; confirm with the developer before building anything broader (such as editing About or Commissions text).

### Upload and edit form
- **Title** (required) and **slug** (generated from title, editable).
- **Images:** one or more, drag to reorder, first is the cover. Alt text per image, defaulting to the title.
- **Description:** markdown textarea with a live preview. Placeholder example:
  ```md
  **Size:** 61 x 51 cm
  **Medium:** acrylic and texture paste on linen canvas
  **Frame:** optional float frame in light or dark wood
  ```
- **Pricing dropdown:** Price, Auction, Display.
  - Price: amount input plus currency select, default EUR. Amount is required.
  - Auction: visible but disabled, labeled "Auction (WIP)".
  - Display: no price on the site. Any stored amount is kept.
- **Status:** Available or Sold.
- **Published:** on or off. Off saves a draft.

### Settings (`/admin/settings`)
- A "Show prices" switch with a one-line explanation of what it does. It writes only `SiteSettings.showPrices` (see the price rules above).

### Images
- Accept JPEG, PNG, and WebP up to 20 MB each. Raise the request body limit for the upload action or route to match.
- iPhone photos are often HEIC, which sharp's prebuilt binaries cannot decode. Ask the developer whether to convert HEIC on the server or reject it with a message asking for JPEG.
- Processing with sharp: auto-rotate from EXIF, then strip all metadata (phone photos carry GPS location), resize to a maximum 2560 px long edge, save as WebP around quality 85, and record width and height.
- Store files in `UPLOAD_DIR`, outside `public/` (Next.js only serves `public/` files that existed at build time). Serve them from `/media/[...path]` with long cache headers.
- Keep storage behind a small interface so local disk can be swapped for S3 or R2 later.
- Deleting an artwork deletes its image files.

### Database
- Prisma models: `Artwork`, `ArtworkImage`, `SiteSettings` (single row), `Inquiry`.
- `npm run db:seed` imports the Phase 1 data from `src/data/artworks.ts`.
- Inquiries are stored as well as emailed.
- After any admin write, revalidate the affected storefront pages.

## Environment

Commit `.env.example`. Never commit `.env`, database files, or `uploads/`.

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=      # from npm run hash-password
SESSION_SECRET=           # at least 32 random characters
UPLOAD_DIR=./uploads
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
MAIL_TO=                  # the artist's inbox for inquiries
```

## Design

- The paintings carry all the color. The interface stays quiet so the work reads as if hung on a plain wall.
- Palette and typeface are chosen with the artist. Until then, keep neutral placeholder tokens in one place so swapping them is a one-file change. Use one type family, two at most.
- Generous whitespace, large images, few borders, no card shadows. Avoid template habits: all-caps labels above headings, hover animations on every card, decorative gradients.
- On the grid, show each cover in a uniform frame (for example 4:5) using `object-fit: contain` so rows line up without cropping the art. On the artwork page, show the full image.
- Availability is conveyed in text, never by color alone.
- Quality floor: works down to 360 px wide, visible keyboard focus, `prefers-reduced-motion` respected, AA contrast, alt text on every image.
- Copy: sentence case, plain verbs, and consistent action names ("Add to cart" leads to "Added to cart").

## Open decisions

Ask the developer before building around any of these:

1. Which languages besides English.
2. Checkout: a payment provider (Stripe Checkout is a good fit) or inquiry-only. Before taking payments, the site needs terms, a privacy policy, shipping info, and a check of EU consumer withdrawal rules, including the online withdrawal function EU shops need from June 2026.
3. Hosting. SQLite and local uploads need a persistent disk, so serverless hosting would need a hosted database and object storage instead.
4. SMTP or email provider.
5. HEIC handling.
6. Whether "edit page layout" should go beyond reordering artworks.

Decided:
- Wordmark spelling: "Matière" everywhere on the site (2026-10-10).
- Git hosting: private GitHub repository https://github.com/PetarTosevski/matiere-atelier (default branch `main`).

## Later (do not build yet)

Auction, currency selection and conversion, translated artwork content, prints, customer accounts, search.

## Working rules

- Stay inside the current phase. Ask before adding features or dependencies.
- No hard-coded UI strings.
- All price and stock display goes through `getPriceView`.
- Pages read artwork data only through `lib/artworks.ts`.
- Validate every input on the server with Zod.
- Never pass a whole `Artwork` to a client component. Its props are serialized into the page, so a hidden price would leak. Pass only the fields it displays.
- Run `lint`, `typecheck` and `test` before finishing.
- Update this file when commands, structure, or decisions change.
