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
  - Status: built (the real email test and a final click-through are still to do). Layout, Originals grid, artwork page with full-screen viewer, language switcher, cart (IDs in localStorage, server-checked on load, order inquiry at checkout), shared inquiry form behind Contact, Commissions, Request and Checkout. About and the Commissions intro use placeholder copy until the artist provides her own. Remaining before Phase 2: a final review and click-through.
- **Phase 2 (Admin + database):** link-only admin area, upload and edit artworks, price modes, global "Show prices" switch.

## Tech stack

- Next.js (App Router, latest stable) with TypeScript in strict mode
- Tailwind CSS, with design tokens defined once as CSS variables
- next-intl for UI translations, using locale-prefixed routes (`/en/originals`)
- Zod for validating every form and server action input
- react-markdown + remark-gfm + rehype-sanitize for artwork descriptions (raw HTML disabled)
- Nodemailer (SMTP) for form emails
- Phase 2: Convex (database, file storage and server functions, Free or Starter plan), sharp for images, iron-session for the admin session, bcrypt for the password hash

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
npx convex dev         # runs alongside npm run dev; pushes convex/ functions and schema on save
npm run db:seed        # imports src/data/artworks.ts and its images into Convex (-- --reset to start over)
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
    fonts.ts                      Karla and Cormorant Garamond via next/font
    actions/
      cart.ts                     resolveCartAction(): checks remembered cart IDs on the server
      inquiry.ts                  submitInquiry(): validate, honeypot, rate limit, email
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
  components/
    InquiryForm.tsx               the one form for CONTACT, COMMISSION, REQUEST and ORDER
    cart/                         cart store (localStorage), provider, notices, cart page view
  lib/
    types.ts        the data model below
    site.ts         SITE_NAME, INSTAGRAM_URL
    artworks.ts     data access. Pages read artworks ONLY through this module
    pricing.ts      getPriceView(), isCartEnabled(): the single source of price and stock display rules
    format.ts       formatPrice()
    settings.ts     site settings (showPrices)
    convex.ts       the only Convex client: server-only, adds the shared secret; static fallback in dev only
    inquiries.ts    stores inquiries in Convex
    metadata.ts     artwork page metadata (never contains a price)
    markdown.ts     plain-text excerpts of descriptions
    cart.ts         resolveCart(), subtotals(): which remembered pieces can still be bought
    inquiry.ts      Zod schemas and field lists for every inquiry form
    inquiry-email.ts  builds the plain-text email the artist receives
    rate-limit.ts   in-memory per-IP limiter (single server; see hosting decision)
    mail.ts         Nodemailer SMTP; in dev without SMTP, writes .eml files to .outbox/
    auth.ts         Phase 2
  data/
    artworks.ts     Phase 1 artwork data
    settings.ts     Phase 1 site settings
messages/
  en.json
scripts/
  seed.mts          npm run db:seed (runs on Node's built-in TypeScript support)
convex/             Convex schema and functions (database and file storage)
  schema.ts         tables: artworks, siteSettings, inquiries, rateLimits
  guard.ts          every function checks CONVEX_SERVER_SECRET (see Phase 2 Database)
  artworks.ts, settings.ts, inquiries.ts, rateLimits.ts, files.ts
public/
  placeholders/     generated placeholder paintings, until real photos arrive
```

`lib/artworks.ts` exposes the same functions in both phases (`getPublishedArtworks()`, `getArtworkBySlug()`, and so on). Phase 2 swaps the static file for Convex inside this module without touching pages.

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
- Header: wordmark (links to Originals), nav (Originals, Commissions, About, Contact), language switcher, "Cart (n)" link, all in small tracked capitals. Below 768 px the nav collapses into a menu (two-line icon); the header language switcher shows from 1024 px, and is in the menu and footer otherwise.
- Footer: copyright line, Instagram and Contact links (Instagram URL from config, placeholder for now), language switcher.
- No search and no customer accounts.

### Originals (`/originals`)
- Intro: a large serif title with one word in the accent color, and a short statement (placeholder until the artist provides text). On desktop the statement sits beside the title.
- Grid of published artworks ("two-up spreads"): 1 column on phones, 2 from tablet (768 px) up.
- Each card is a panel: the cover at its own proportions, then a number ("01"), title, availability, price, and a "View piece" cue. The whole card links to the artwork page; the cue is not a separate button.
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
- Process in Next.js (server action or route handler), then upload the WebP to Convex file storage. Each image record keeps its `storageId`, width, height and alt text; `src` is the Convex storage URL, resolved on the server.
- `next.config.ts` allows the Convex deployment host in `images.remotePatterns`, so `next/image` resizes and caches them. That keeps Convex file bandwidth (1 GB a month on the Free plan) low.
- Keep storage behind a small interface (`lib/storage.ts`) so it can move to S3 or R2 later.
- Deleting an artwork deletes its stored files.

### Database (Convex)
- Convex holds the data and the uploaded images, on the Free plan (hard caps: 0.5 GB database, 1 GB files, 1M function calls a month; writes fail at a cap) or Starter (same allowances, overages billed). Hosting of the Next.js app is chosen separately and is no longer constrained by the database.
- Tables: `artworks` (the Artwork shape above, with images as `{ storageId, width, height, alt }`), `siteSettings` (single document), `inquiries`, `rateLimits`.
- **Next.js talks to Convex only on the server**, through `ConvexHttpClient` with `CONVEX_URL`, from server components, server actions and route handlers. There is no Convex client in the browser: no `ConvexProvider`, no `useQuery`. Otherwise hidden prices and drafts could reach the browser.
- **Every Convex function checks a shared secret.** A deployment URL can be called by anyone, so each query, mutation and action takes a `secret` argument and compares it with the `CONVEX_SERVER_SECRET` environment variable set in Convex. Use the wrappers in `convex/guard.ts`; never export an unguarded public function. Admin permissions are still checked in Next.js (session) before calling a write.
- `lib/artworks.ts` and `lib/settings.ts` keep their signatures and call Convex. Pricing rules stay in `lib/pricing.ts`; Convex returns raw data.
- Inquiries are stored in Convex as well as emailed. The per-IP limits for forms and login move from memory into the `rateLimits` table, so they work on any host, serverless included.
- `npm run db:seed` imports `src/data/artworks.ts` and uploads its placeholder images. It is idempotent (matches on slug).
- Status: built and in use by the storefront (schema, guarded functions, seed, Convex-backed rate limits and stored inquiries). Admin UI and image uploads still to do.
- Local development runs an anonymous local Convex backend (`CONVEX_AGENT_MODE=anonymous npx convex dev`, data on this machine only). To move to the cloud: `npx convex login`, then `npx convex dev --configure` to create or link a cloud project, `npx convex env set CONVEX_SERVER_SECRET ...`, and `npm run db:seed`.
- Without Convex configured, `lib/convex.ts` falls back to `src/data` in development and tests only; production throws instead of serving placeholders.
- Commit `convex/_generated/` (Convex recommends it); it is ignored by ESLint.
- After any admin write, revalidate the affected storefront pages (`revalidatePath`).

## Environment

Commit `.env.example`. Never commit `.env` or `.env.local`.

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CONVEX_URL=               # deployment URL; npx convex dev writes it to .env.local
CONVEX_SERVER_SECRET=     # long random string; also set in Convex: npx convex env set CONVEX_SERVER_SECRET ...
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=      # from npm run hash-password
SESSION_SECRET=           # at least 32 random characters
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
MAIL_TO=                  # the artist's inbox for inquiries
```

## Design

- Look: "Two-up Spreads" (Claude Design, adopted 2026-10-11). A dark gallery wall (`#141414`) with slightly lighter panels behind the work, warm off-white text and one dusty-pink accent used sparingly (card numbers, cart link, buttons, one word of the Originals title). All tokens live in `src/app/tokens.css`, so changing the palette is a one-file change.
- Type: Cormorant Garamond for headings and numbers, Karla for everything else, both through `next/font/google` (`src/app/fonts.ts`).
- Sizing is in rem and the root font size grows on large screens (16 px up to about 1440 px wide, about 25 px at 2560), so the whole layout scales up rather than floating in a narrow column.
- Generous whitespace, large images, no card shadows. Avoid hover animations on every card and decorative gradients.
- Never crop the art: grid covers keep their own proportions inside the panel; the artwork page shows the full image.
- Availability is conveyed in text, never by color alone.
- Quality floor: works down to 360 px wide, visible keyboard focus, `prefers-reduced-motion` respected, AA contrast, alt text on every image.
- Copy: sentence case, plain verbs, and consistent action names ("Add to cart" leads to "Added to cart").

## Open decisions

Ask the developer before building around any of these:

1. Which languages besides English.
2. Checkout: a payment provider (Stripe Checkout is a good fit) or inquiry-only. Before taking payments, the site needs terms, a privacy policy, shipping info, and a check of EU consumer withdrawal rules, including the online withdrawal function EU shops need from June 2026.
3. Hosting for the Next.js app (to be chosen later). Vercel Hobby is non-commercial only, so it doesn't fit a storefront. Netlify, Cloudflare Workers and a small VPS all work with Convex.
4. HEIC handling.
5. Whether "edit page layout" should go beyond reordering artworks.

Decided:
- Wordmark spelling: "Matière" everywhere on the site (2026-10-10).
- Email: the artist's Google Workspace mailbox, sent through Gmail SMTP (smtp.gmail.com:465) with an app password in `SMTP_PASS` (2026-10-11). Without SMTP configured, development writes emails to `.outbox/` and production refuses to send.
- Nodemailer is pinned to an exact version (`--save-exact`), chosen at least two weeks old.
- Database and file storage: Convex, Free or Starter plan (2026-10-11). Replaces the earlier Prisma + SQLite + local uploads plan.
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
- Commit after every change (standing rule from the developer, 2026-10-11): each finished change gets its own commit right away, without asking first. Pushing still needs the developer's go-ahead.
- Update this file when commands, structure, or decisions change.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:46cd31e7 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
