# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Matière Atelier** is an online storefront for a painter selling her original artworks. The client asked for something simple and artwork-first.

Structural reference (match its calm layout, not its branding):
- Collection grid: https://fae-8008.myshopify.com/collections/original-artworks
- Artwork page: https://fae-8008.myshopify.com/products/kopie-first-tracks

The site name lives in one constant (`SITE_NAME = "Matière Atelier"` in `src/lib/site.ts`). Everywhere on the site it is written "Matière"; only the repo and package name stay `matiere-atelier`.

Work happens in phases. Finish and verify a phase before starting the next. Do not build anything under "Later" unless asked.

- **Phase 1 (V1 storefront):** Originals, artwork pages, request page, Commissions, About, Contact, cart, currency switcher. Artwork data comes from a typed file.
  - Status: built (the real email test and a final click-through are still to do). Layout, Originals grid, artwork page with full-screen viewer, visitor currency switcher (replaced the language switcher 2026-10-12), cart (IDs in localStorage, server-checked on load, order inquiry at checkout), shared inquiry form behind Contact, Commissions, Request and Checkout. About and the Commissions intro use placeholder copy until the artist provides her own. Remaining before Phase 2: a final review and click-through.
- **Customer accounts** (asked for 2026-10-12, design "Art Storefront Screens"): built. Header "Login" button / "My account" menu, `/login` (Sign in | Create account, Forgot password), `/account` (My Collection: orders sent while signed in; Account details; Change password), reset by email. Order tracking beyond "Order sent" needs the admin side (open decision 4). Still to do from the same design: the visual changes (beads issue).
- **Phase 2 (Admin + database):** link-only admin area, upload and edit artworks, price modes, global "Show prices" switch.
  - Status: built. Sign-in (redesigned 2026-10-12: split layout, email, "Keep me signed in", reset by email), the collection editor at `/admin` (the Originals page with drag/arrow reordering, an edit side panel, an upload tile, the shop currency switcher, the "Show prices" switch and a batched "Publish changes"), About page editor, Convex database. Convex cloud project `matiere-atelier` created 2026-10-12 (production `earnest-tapir-200`, seeded; a cloud dev deployment `quick-cricket-186` exists but local development still uses the anonymous local backend). Hosting: Vercel Hobby for now (2026-10-13), deployed at https://matiereatelier.com (GoDaddy DNS: `A @ 216.198.79.1`, `www` CNAME to Vercel; the bare domain redirects to `www`).

## Tech stack

- Next.js (App Router, latest stable) with TypeScript in strict mode
- Tailwind CSS, with design tokens defined once as CSS variables
- next-intl for UI translations, using locale-prefixed routes (`/en/originals`)
- Zod for validating every form and server action input
- react-markdown + remark-gfm + rehype-sanitize for artwork descriptions (raw HTML disabled)
- Nodemailer (SMTP) for form emails
- Phase 2: Convex (database, file storage and server functions, Free or Starter plan), sharp for images, iron-session for the admin session, bcrypt for the password hash (the `bcryptjs` package: same algorithm, no native build)

Ask before adding dependencies not listed here. Check current docs for conventions that change between framework versions (for example, recent Next.js versions rename `middleware.ts` to `proxy.ts`). The docs for the installed Next.js version ship in `node_modules/next/dist/docs/` (see AGENTS.md, which `next dev` maintains).

Installed: Next.js 16, React 19, next-intl 4, Tailwind CSS 4 (tokens in `src/app/tokens.css`), Zod 4, Vitest 5 (dev only, for tests).

## Commands

Create these scripts during setup and keep this list current:

```bash
npm run dev            # local Convex backend and Next dev server together (convex dev --start "next dev")
npm run dev:next       # Next dev server alone (when convex dev already runs in another terminal)
npm run build          # production build
npm run lint           # eslint (next lint no longer exists)
npm run typecheck      # next typegen && tsc --noEmit (typegen creates the PageProps/LayoutProps route types)
npm run start          # serve the production build
npm run test           # vitest run: unit tests and price-hiding render tests
npx convex dev         # Convex alone (npm run dev already runs it); pushes convex/ functions and schema on save
npm run db:seed        # imports src/data/artworks.ts and its images into Convex (-- --reset to start over)
npm run hash-password  # prints an ADMIN_PASSWORD_HASH line for .env (password typed hidden)
npm run brand-images   # redraws the icons and the default share image (after a palette or name change)
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
    robots.ts, sitemap.ts         crawlers kept out until ALLOW_INDEXING=true; sitemap lists pages and published artworks
    icon.png, apple-icon.png      site icons (npm run brand-images)
    globals.css                   base styles and small utilities
    tokens.css                    design tokens: the one file to change for palette and type
    fonts.ts                      Karla and Cormorant Garamond via next/font
    actions/
      cart.ts                     resolveCartAction(): checks remembered cart IDs on the server
      inquiry.ts                  submitInquiry(): validate, honeypot, rate limit, email; links orders to a signed-in customer
      account.ts                  customer sign in, create account, reset, sign out, details, change password
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
      login/page.tsx              customer Sign in | Create account | Forgot password (welcome view once signed in)
      account/page.tsx            My Collection (?tab=details: Account details, Change password)
      account/reset/page.tsx      new password from an emailed link
    admin/                        Not localized, never linked from the site
      layout.tsx                  own <html>; default-locale copy; noindex
      actions.ts                  every admin server action (each checks the session)
      upload/route.ts             image upload step 1: a one-time Convex upload URL for the original (admin only)
      upload/process/route.ts     step 2: sharp turns the uploaded original into the stored WebP and deletes the original
      login/page.tsx              split layout: featured piece, sign-in form
      forgot/page.tsx, reset/page.tsx  admin password reset by email
      (panel)/layout.tsx          olive "Admin mode" bar with the admin links; checks the session
      (panel)/page.tsx            the collection editor (see "Collection editor" below)
      (panel)/about/page.tsx      About page editor (portrait and bio)
  components/
    InquiryForm.tsx               the one form for CONTACT, COMMISSION, REQUEST and ORDER
    OriginalsGrid.tsx, ArtworkBody.tsx, OriginalsIntro.tsx, grid.ts  storefront Originals and artwork page parts
    admin/                        login (AdminAuthShell, LoginForm, reset forms), About form, MarkdownField (toolbar + preview)
    auth/                         fields shared by admin and customer forms (Show password, Keep me signed in), ForgotPasswordForm, NewPasswordForm
    account/                      account hint (localStorage), AccountButton (header Login / My account), LoginScreen, AccountForms, SignOutButton
    admin/collection/             CollectionEditor (state, toolbar, publish), WorkCard, EditPanel, ImagesField, upload helper
    cart/                         cart store (localStorage), provider, notices, cart page view
    currency/                     visitor currency: store (localStorage), provider, DisplayPrice, CurrencySwitcher
    theme/                        theme store (localStorage), ThemeScript (applies it before paint), ThemeToggle
    admin-hint/                   the artist's Edit link on the storefront: hint store (localStorage), RememberAdmin, LogoutForm, AdminEditLink
  lib/
    types.ts        the data model below
    site.ts         SITE_NAME, INSTAGRAM_URL, STUDIO_EMAIL
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
    auth.ts         admin session (iron-session) and credential check (bcrypt)
    artwork-form.ts parseArtworkFields(): checks for one artwork; message keys as errors
    collection-changes.ts  parseCollectionChanges(): checks a whole "Publish changes" request
    currency.ts     SHOP_CURRENCIES, currencySymbol()
    exchange-rates.ts  getExchangeRate(): ECB rates via the Frankfurter API, for the admin's Convert prices
    images.ts       sharp processing; sniffs the real file type; HEIC is refused
    storage.ts      small file-storage interface over Convex storage
    money.ts        "1450.50" to integer cents and back, without floats
    slug.ts         slugify()
    pages.ts        About page content (Convex); null until first saved
    session.ts      iron-session helpers shared by admin and customers ("Keep me signed in", expiry, renewal)
    password.ts     bcrypt hashing, reset tokens (only a SHA-256 is stored)
    password-reset.ts  create, check and use reset links (Convex passwordResets)
    customer-auth.ts   customer session: getCustomer(), sign in/out
    admin-account.ts   the admin is also a user: one sign-in and sign-out for both, admin password for the admin's account
    account-forms.ts   Zod checks for every sign-in, account and password form
    about-form.ts   checks for the About form
    markdown-format.ts  toolbar edits for the description field
    order.ts        compareArtworks(): Originals order, usable in the browser too
    admin-hint.ts   adminEditTarget(): where the storefront's Edit link goes from each page
  data/
    artworks.ts     Phase 1 artwork data
    settings.ts     Phase 1 site settings
messages/
  en.json
scripts/
  seed.mts          npm run db:seed (runs on Node's built-in TypeScript support)
  hash-password.mts npm run hash-password
  brand-images.mts  npm run brand-images (next/og, Google Fonts TTFs fetched while drawing)
convex/             Convex schema and functions (database and file storage)
  schema.ts         tables: artworks, aboutPage, siteSettings, inquiries, rateLimits, customers, passwordResets, adminCredentials
  storage.ts        deleteFilesIfPresent(): file cleanup that skips already-deleted files
  guard.ts          every function checks CONVEX_SERVER_SECRET (see Phase 2 Database)
  artworks.ts, pages.ts, settings.ts, inquiries.ts, rateLimits.ts, files.ts
public/
  placeholders/     generated placeholder paintings, until real photos arrive
  share-image.png   default Open Graph image (defaultShareImage() in lib/metadata.ts); artwork pages use their cover
```

`lib/artworks.ts` exposes the same functions in both phases (`getPublishedArtworks()`, `getArtworkBySlug()`, and so on). Phase 2 swaps the static file for Convex inside this module without touching pages.

## Data model

Use this shape from day one, even while data is static, so Phase 2 is a storage swap and not a rewrite.

```ts
type PriceMode = "PRICE" | "AUCTION" | "DISPLAY";
type Status = "AVAILABLE" | "SOLD";

type ArtworkImage = { src: string; width: number; height: number; alt: string };

type Dimensions = { width: number; height: number }; // cm, decimals allowed (measurements, not money)

type Artwork = {
  id: string;
  slug: string;               // unique, generated from title, editable
  title: string;
  description: string;        // markdown
  priceMode: PriceMode;
  priceAmount: number | null; // integer hundredths of the main unit (cents), for every currency
  currency: string;           // ISO 4217; always the shop currency (SiteSettings.currency)
  status: Status;
  published: boolean;         // drafts never appear on the storefront
  sortOrder: number;          // controls order on Originals
  dimensions: Dimensions | null; // centimetres, width first; null if unknown
  images: ArtworkImage[];     // first image is the cover; second shows on hover in the grid
  createdAt: string;
};

type SiteSettings = { showPrices: boolean; currency: string; theme: "dark" | "light" }; // currency: the shop currency, default "EUR"; theme: the default for visitors, default "dark"

type InquiryType = "CONTACT" | "COMMISSION" | "REQUEST" | "ORDER";
```

Rules:
- Money is stored as integer hundredths of the main unit plus a currency code, for every currency (so ¥160,000 is stored as 16000000). Yen and won have no cents, so their amounts must be whole (`wholeAmount` error in the admin). A payment provider that expects ISO minor units (JPY has none) needs a conversion at checkout. Never use floats for money.
- Changing `priceMode` never clears `priceAmount`, so switching back to Price restores the old price.
- `AUCTION` is not selectable yet. If it ever appears in data, render it exactly like `DISPLAY`.
- The shop has one currency (`SiteSettings.currency`): EUR, USD, GBP, CHF, SEK, AUD, JPY, CNY, HKD, SGD, KRW or INR (`SHOP_CURRENCIES`). Switching it in the admin sets every artwork's `currency` to match. Amounts are relabelled as they are (€1,450 becomes $1,450) unless the artist presses **Convert prices**, which converts every stored amount (Display pieces too) at the day's European Central Bank rate (Frankfurter API, `lib/exchange-rates.ts`, no key) and rounds to whole amounts, with integer arithmetic (`convertAmount` in `lib/money.ts`). The conversion can be undone until Publish.
- Dimensions are a structured field, not part of the markdown description. They are shown width first ("80 × 100 cm", with locale number formatting) under the title on the grid and on the artwork page. Depth, inches and showing pieces at their true relative scale can build on this field later.

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
- Prices are formatted with `Intl.NumberFormat` using the active locale and `currencyDisplay: "narrowSymbol"`, so EUR always shows the € symbol; AUD, CNY, HKD and SGD use their own symbol (A$, CN¥, HK$, SGD) so they don't read as $ or ¥. Whole amounts drop the decimals; yen and won never show any.
- **Visitor currency:** visitors can view prices in any shop currency (header from 1024 px, menu, footer; only while prices are shown). The choice is a code in localStorage; rates come from the server (ECB via `getExchangeRates`, cached an hour) and the conversion happens in the browser (`components/currency/`). Converted prices are marked "≈" (read as "about") and rounded to whole amounts. The server and first render always show the shop currency. Orders, emails, metadata and JSON-LD stay in the shop currency, and the cart says the artist invoices in it.

## Phase 1: storefront

### Layout
- Header: wordmark (links to Originals), nav (Originals, Commissions, About, Contact), currency switcher, theme toggle, "Cart (n)" link, "Login" button (or "My account" with a menu once signed in; from 768 px, in the menu below), all in small tracked capitals, with a thin line under the header. Below 768 px the nav collapses into a menu (two-line icon); the header currency switcher and theme toggle show from 1024 px, and are in the menu and footer otherwise.
- Footer: copyright line, Instagram and Contact links and the studio email (`STUDIO_EMAIL`, a mailto link; Instagram URL from config, placeholder for now), currency switcher, theme toggle.
- No search.

### Customer accounts
- Optional: buying never needs an account (checkout stays an inquiry). Signing in fills in name and email on the inquiry forms, and orders sent while signed in show in My Collection (stored on the inquiry: `customerId` and a snapshot of the pieces and prices).
- Customers live in Convex (`customers`: email lowercased, bcrypt hash made in Next.js, first and last name, newsletter choice, `sessionVersion`). Accounts need Convex; without it the forms say accounts are unavailable.
- Session: iron-session cookie `matiere_account` on `path=/`. Only `/login`, `/account` and server actions read it, so storefront pages stay static. The header learns who is signed in from a hint in localStorage (`components/account/account-store.ts`), which the login and account pages keep in line with the session; it is never trusted for anything else.
- "Keep me signed in": a 30-day cookie that renews when used; otherwise a browser-session cookie whose session also expires after a day (`lib/session.ts`). The admin uses the same rules.
- Passwords: at least 8 characters, at most 72 bytes (bcrypt's limit; longer is refused, not cut). Changing or resetting a password bumps `sessionVersion`, which signs out every other session.
- Reset: "Forgot password?" emails a one-time link (30 minutes; only its SHA-256 is stored in `passwordResets`) to the account's address. The answer is the same whether or not the account exists, and sign-in takes as long for unknown emails. Rate limits (Convex): sign-in 10 / 15 min, create 5 / hour, reset 5 / 15 min per IP; password change 5 / 15 min per account.
- **The admin is also a user** (2026-10-12): signing in as the admin also signs in the admin's own customer account (email = `ADMIN_USERNAME`, made on first sign-in, first name taken from the email and editable). The admin's email on `/login` signs into both with the admin password; "Create account" refuses it; "Forgot password?" sends the admin reset link; Change password changes the admin password. Signing out anywhere (header, account page, admin bar) ends both sessions. Every admin page calls `syncAdminAccountAction`, so the header never shows another customer or "Login" while the admin is signed in. Rules in `lib/admin-account.ts`.
- Changing the account email is not built (the page says to get in touch). No email verification yet.
- Deleting an account (Account details, "Delete account", password to confirm; 2026-10-12): removes the customer and their reset links and signs out. Orders and messages they sent stay in `inquiries` (the artist has them by email anyway) but lose their `customerId`. The admin's own account can't be deleted there.
- Before launch: accounts hold personal data, so the site needs a privacy policy covering them (not written yet; needs the artist's details).

### Originals (`/originals`)
- Intro: a large serif title with one word in the accent color, and a short statement (placeholder until the artist provides text). On desktop the statement sits beside the title.
- Grid of published artworks ("two-up spreads"): 1 column on phones, 2 from tablet (768 px), 3 from 1280 px (`GRID_CLASS` in `components/grid.ts`, shared with the admin). In three columns the cards are tighter and the covers smaller, and price and "View piece" sit under the title.
- Each card is a panel: the cover at its own proportions, then a number ("01"), title, dimensions and availability, price, and a "View piece" cue. The whole card links to the artwork page; the cue is not a separate button.
- When a piece has a second image, hovering the card (or focusing it with the keyboard) crossfades to it; a close-up of the surface works best. This is a deliberate exception to "no hover animations on every card": it only happens where there is a detail photo, it carries information, and the transition is removed for reduced motion.
- Ordered by `sortOrder`, then newest first.
- Empty state with a short line pointing to Commissions or Contact.

### Artwork page (`/originals/[slug]`)
- Desktop: images left, details right. Mobile: stacked.
- Large image that is never cropped. Clicking it opens a full-screen view so visitors can see texture. If there are several images, show thumbnails.
- Details: title, dimensions, price, availability, primary action (from `getPriceView`), then the rendered markdown description.
- Unknown or unpublished slugs return 404.
- Metadata: page title, description excerpt, cover image as Open Graph image. Follow the price hiding rules.

### Search engines and sharing
- Until launch, `robots.txt` disallows everything and every storefront page sends `noindex, nofollow` (admin pages always do). Setting `ALLOW_INDEXING=true` in Vercel and redeploying opens the site and adds the sitemap to `robots.txt`. `/admin` is never named in `robots.txt`.
- `sitemap.xml` lists Originals, Commissions, About, Contact and every published artwork (with its cover); admin changes refresh it.
- Pages that aren't an artwork share `public/share-image.png`. It sits in the `[locale]` layout's `openGraph.images`, not in an `opengraph-image` file, because a segment's `openGraph` replaces its parent's, and a file under `[locale]` gets a `/-/` address.

### Request page (`/request/[slug]`)
- Same layout as Contact, with the piece's thumbnail and title shown read-only above the form.
- Fields: name, email, message. Sends a `REQUEST` inquiry that includes the artwork title and link.

### Commissions, About, Contact
- Commissions: intro copy (placeholder until the artist provides text) and a form with name, email, description of the desired piece, approximate size, and an optional budget. Sends a `COMMISSION` inquiry.
- About: portrait and bio placeholders.
- Contact: name, email, message. Sends a `CONTACT` inquiry. Above the form, a "Prefer email?" line links to `STUDIO_EMAIL`. The other Workspace aliases (inquiries, orders, commissions, privacy, noreply, newsletter, shop) are not used yet.

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
- There is no language switcher (removed 2026-10-12 while the site is English only). Bring one back if a second locale is added.
- Artwork titles and descriptions are single-language in V1.

## Phase 2: admin and database

### Access
- The admin area lives at `/admin` and is never linked from the site for visitors (only the artist's own Edit link, below), never added to the sitemap, and not listed in `robots.txt` (listing it would advertise it). Admin responses send `X-Robots-Tag: noindex`.
- Being unlinked is not security. Every admin page, server action, and route handler checks the session on the server. A middleware/proxy check alone is not enough.
- Credentials come from env: `ADMIN_USERNAME` (an email address; an older plain username still signs in, but reset links need an email) and `ADMIN_PASSWORD_HASH`. After a reset from the site the hash lives in Convex (`adminCredentials`) and wins over the env one; `adminCredentials:clear` (with the secret) goes back to the env hash. The plaintext password is never stored. `npm run hash-password` prints the hash with each `$` escaped as `\$`, because Next.js expands `$` in `.env` files.
- Session: iron-session cookie, `httpOnly`, `secure`, `sameSite: "lax"`. "Keep me signed in" (on by default) gives 30 days, renewed by admin actions; otherwise it ends with the browser (and after a day at most). Include a logout button.
- Login screen (design "Art Storefront Screens", 2026-10-12): the first piece on Originals on one side, the form on the other (Email, Password with Show, Keep me signed in, Forgot password?). "Forgot password?" emails a reset link to `ADMIN_USERNAME` (`/admin/forgot`, `/admin/reset`); a reset ends every admin session. No public link to the admin (decided again 2026-10-12: the Edit link below covers it).
- Login is rate limited (5 attempts per 15 minutes per IP, counted in Convex). To unlock after a lockout, call the `rateLimits:reset` Convex function with the secret and the key `login:<ip>`.
- **Edit link on the storefront** (2026-10-12): admin pages mark the browser as the artist's in localStorage (cleared on Log out). That browser then shows a small accent "Edit" link in the bottom-left corner of the storefront: on an artwork or request page it opens `/admin?edit=<slug>` with that piece's edit panel open, on About it opens the About editor, elsewhere the collection. It is only a hint: pages stay static, visitors get nothing in the HTML, and `/admin` still checks the session (an expired session lands on the login page).
- The session cookie is limited to `path=/admin`, so it is never sent with storefront requests. `secure` is on in production only, because browsers drop secure cookies on plain-http localhost.

### Collection editor (`/admin`)
- Design: Claude Design "Art Storefront Layouts – ADMIN PANEL · admin" (adopted 2026-10-11). The page shows the collection as visitors see it (storefront header, Originals intro, two-up cards, footer) with admin controls on top. Header and footer there are a picture of the storefront, not links.
- Olive bar, sticky on every admin page: "Admin mode" with links to Collection, About page, View site, Log out (plain `<a>`, so leaving with unpublished changes triggers the browser's warning). Under it, on this page, the toolbar: hint, **Currency** select, **Show prices** switch (On/Off; its explanation shows once it differs from the live setting), **Theme** (Dark | Light: the default every visitor sees; the admin page previews it as you switch), "+ Upload works", "Unpublished changes" / "All changes are live", and **Publish changes**. The toolbar sticks right under the bar from 768 px up (the bar is exactly `h-14` there; the toolbar uses `md:top-14`).
- Each card: drag handle with "Drag to move · Row 2, left" (left, middle or right in three columns) ("Position 3 of 8" on phones), ← / → buttons, and **Edit**. Below, the same parts as the storefront card; its "View piece ↗" opens the piece's live page in a new tab (dimmed for drafts and new pieces, which have no page yet; the address is the published one until Publish). "No price set", "Check the price", "Draft, not on the site" and "Needs attention" show in the warning color. With "Show prices" off the cards hide their prices (and the header picture its cart link), as the site does; the price warnings stay so they can be fixed. All artworks are listed, drafts included.
- **Add new works** tile at the end (also "+ Upload works" and dropping files on a card): each image becomes a new draft piece titled after its file name, added at the end, and the edit panel opens on it.
- **Edit panel** (fixed on the right, full width on phones): image preview and "Replace image" (the cover), Name, Price (shop currency symbol in front; "Shown on the site as …"), Description (MarkdownField), then More details: size, price mode (Price, Auction (WIP) only where already set, Display), status, "Show on the site", web address, all images with alt text and order. "Delete this piece" deletes right away after confirmation (not on Publish). "Done" closes the panel.
- **Publish changes**: edits, reordering, new pieces, the currency, "Show prices" and the theme stay in the browser until Publish. The whole collection is then checked on the server (`parseCollectionChanges`, same rules as one artwork) and written in one Convex transaction (`artworks:applyChanges`), so either everything goes live or nothing does. Problems are marked on their cards and shown in the panel. The card order becomes `sortOrder`, which is how the artist controls the Originals layout.
- New uploads are stored in Convex right away (so Publish can reference them); an unpublished upload that is removed or replaced is deleted.
- A draft may be saved without a price; a piece shown on the site in Price mode needs one.

### About page (`/admin/about`)
- The artist edits the About page: an optional portrait (same upload pipeline as artworks; alt text required, since there is no title to fall back on) and the bio as markdown, with the same toolbar and live preview as artwork descriptions (`components/admin/MarkdownField.tsx`).
- The "About" heading stays in `messages/en.json` like the rest of the interface copy. Until the page is saved, the storefront shows the placeholders from `messages/en.json`; an empty bio or no portrait falls back to them too.
- Stored in Convex as a single `aboutPage` document. Saving deletes the previous portrait file when it is replaced or removed; an unsaved upload that is swapped out is deleted right away.
- Editing other pages (Commissions intro, for example) is not built; ask the developer first.

### Artwork fields (edit panel)
- **Title** (required) and **slug** (generated from title, editable).
- **Images:** one or more, drag to reorder, first is the cover. Alt text per image, defaulting to the title.
- **Size:** width and height in centimetres (both or neither; dot or comma decimals).
- **Description:** markdown textarea with a formatting toolbar (bold, italic, heading, bulleted and numbered lists, quote, link; Ctrl/Cmd+B, I and K) and a live preview. In a list, Enter starts the next item (an empty item ends the list, or steps out of a sub-list), Tab nests the item under the one above and Shift+Tab moves it back; outside a list Tab moves focus as usual. The toolbar edits live in `lib/markdown-format.ts`.
- **Pricing:** Price, Auction, Display.
  - Price: amount in the shop currency. Amounts are typed in major units (1450 or 1450.50) and converted to cents with string arithmetic; ambiguous input such as 1,450 is rejected. Required once the piece is shown on the site.
  - Auction: visible but disabled, labeled "Auction (WIP)".
  - Display: no price on the site. Any stored amount is kept.
- **Status:** Available or Sold.
- **Published** ("Show on the site"): on or off. Off keeps a draft.

### Show prices
- The switch lives in the collection editor's toolbar (there is no separate Settings page, decided 2026-10-12). It is published with the other changes and writes only `SiteSettings.showPrices` (see the price rules above).

### Images
- Accept JPEG, PNG, and WebP up to 20 MB each. The photo never passes through Next.js (Vercel refuses request bodies over 4.5 MB): the browser gets a one-time Convex upload URL from `/admin/upload` (session checked), POSTs the original there, then calls `/admin/upload/process` with its `storageId`. The server checks the size, downloads and processes it, stores the WebP and always deletes the original (it may carry GPS). Shared browser helper: `uploadImage()` in `components/admin/collection/upload.ts`. This upload URL is the only time the browser talks to Convex; it can store one file and read nothing.
- An upload removed from the form before saving is deleted right away. If the form is abandoned without saving, its uploads stay in storage (a cleanup job can come later).
- iPhone photos are often HEIC, which sharp's prebuilt binaries cannot decode. Decided: reject HEIC (detected from the file's bytes) with a message asking for JPEG, PNG or WebP. The file picker accepts only those types, so iOS usually converts photos to JPEG on upload anyway.
- Processing with sharp: auto-rotate from EXIF, then strip all metadata (phone photos carry GPS location), resize to a maximum 2560 px long edge, save as WebP around quality 85, and record width and height.
- Process in Next.js (`/admin/upload/process`), then upload the WebP to Convex file storage. Each image record keeps its `storageId`, width, height and alt text; `src` is the Convex storage URL, resolved on the server.
- `next.config.ts` allows the Convex deployment host in `images.remotePatterns`, so `next/image` resizes and caches them. That keeps Convex file bandwidth (1 GB a month on the Free plan) low.
- Keep storage behind a small interface (`lib/storage.ts`) so it can move to S3 or R2 later.
- Deleting an artwork deletes its stored files.

### Database (Convex)
- Convex holds the data and the uploaded images, on the Free plan (hard caps: 0.5 GB database, 1 GB files, 1M function calls a month; writes fail at a cap) or Starter (same allowances, overages billed). Hosting of the Next.js app is chosen separately and is no longer constrained by the database.
- Tables: `artworks` (the Artwork shape above, with images as `{ storageId, width, height, alt }`), `aboutPage` (single document: bio and portrait), `siteSettings` (single document), `inquiries`, `rateLimits`, `customers`, `passwordResets`, `adminCredentials` (single document, only after an admin password reset).
- Textarea input (descriptions, bio) is stored with plain LF line breaks; browsers submit CRLF, which the form parsers normalize.
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
ADMIN_USERNAME=           # the admin's email address (sign-in name, and where reset links go)
ADMIN_PASSWORD_HASH=      # from npm run hash-password
SESSION_SECRET=           # at least 32 random characters
ALLOW_INDEXING=           # "true" at launch lets search engines in (then redeploy); unset keeps them out
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
MAIL_TO=                  # the artist's inbox for inquiries
```

## Design

- Look: "Two-up Spreads" (Claude Design, adopted 2026-10-11), with the warmer palette from "Art Storefront Screens" (2026-10-13): a warm dark gallery wall (`#15130f`) with slightly lighter panels behind the work, warm off-white text and one sage accent (`#a9b87e`, replacing the earlier dusty pink) used sparingly (card numbers, cart link, buttons, one word of the Originals title). The admin bar and toolbar are olive (`admin`, `on-admin` tokens) in both themes. All tokens live in `src/app/tokens.css`, so changing the palette is a one-file change.
- Light theme: "Warm Linen" (Claude Design, adopted 2026-10-12): linen ground (`#eee6da`), paper-white panels, dark brown text, an olive accent (`#4f5d2f`), filled primary buttons and a soft shadow under the art. It is the same tokens redefined under `<html data-theme="light">`; components use tokens only (`on-accent` for anything drawn on the accent, `well`, `--shadow-art`), never fixed colors. Control borders are darker than the design's (`#8f8170`) to keep 3:1.
- Theme choice: the admin sets the default (`SiteSettings.theme`, Theme in the collection toolbar). Visitors can switch with "Light mode"/"Dark mode" (header from 1024 px, menu, footer); the choice is kept in localStorage and applied by an inline script before paint, so pages stay static and never flash.
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
3. When to move off Vercel Hobby (see Decided). Hobby is non-commercial only; move to Vercel Pro, Netlify, Cloudflare Workers or a small VPS before the site sells.
4. Whether the admin gets a page to read stored inquiries (they are in Convex already).
5. Slug changes: whether old artwork URLs should redirect to the new one (not built).
6. Whether other page text (such as the Commissions intro) should become editable like About.

Decided:
- Wordmark spelling: "Matière" everywhere on the site (2026-10-10).
- Email: the artist's Google Workspace mailbox, sent through Gmail SMTP (smtp.gmail.com:465) with an app password in `SMTP_PASS` (2026-10-11). Without SMTP configured, development writes emails to `.outbox/` and production refuses to send.
- Nodemailer is pinned to an exact version (`--save-exact`), chosen at least two weeks old.
- "Edit page layout": reordering artworks plus editing the About page (portrait and bio) in the admin (2026-10-11).
- HEIC uploads are rejected with a message (2026-10-11).
- Light mode: visitors switch for themselves; the admin sets the default for everyone (2026-10-12).
- Shop currency: one site-wide currency, switchable in the admin among the `SHOP_CURRENCIES` (AUD and the Asian currencies added 2026-10-12); switching relabels prices, and "Convert prices" converts them at the ECB rate, rounded to whole amounts (2026-10-11, conversion added 2026-10-12).
- Database and file storage: Convex, Free or Starter plan (2026-10-11). Replaces the earlier Prisma + SQLite + local uploads plan.
- Hosting: Vercel Hobby for now, until the artist starts selling (2026-10-13). Hobby's terms are non-commercial only, so the site moves to a paid plan or another host before taking real orders.
- Git hosting: private GitHub repository https://github.com/PetarTosevski/matiere-atelier (default branch `master`, renamed from `main` on 2026-10-12).

## Later (do not build yet)

Auction, per-piece currencies, translated artwork content, prints, search. (Customer accounts moved out of this list on 2026-10-12.)

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
