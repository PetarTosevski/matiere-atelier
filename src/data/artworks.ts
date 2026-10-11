import type { Artwork } from "@/lib/types";

// Phase 1 placeholder artworks. Together they cover every row of the price
// table in CLAUDE.md, and the covers mix portrait, landscape, square, very
// wide and very tall images so the grid's framing can be checked.
// `npm run db:seed` (Phase 2) imports this file into the database.

export const artworks: Artwork[] = [
  {
    // PRICE + AVAILABLE, portrait 4:5.
    id: "art_01",
    slug: "low-tide",
    title: "Low Tide",
    description: [
      "**Size:** 80 x 100 cm",
      "**Medium:** acrylic and texture paste on linen canvas",
      "**Frame:** optional float frame in light or dark wood",
      "",
      "Painted over a winter of early walks along the estuary, when the water pulls back and leaves bands of wet sand, slate and light.",
    ].join("\n"),
    priceMode: "PRICE",
    priceAmount: 145000,
    currency: "EUR",
    status: "AVAILABLE",
    published: true,
    sortOrder: 1,
    images: [
      {
        src: "/placeholders/low-tide.webp",
        width: 1920,
        height: 2400,
        alt: "Thick slate-blue and white paint breaking like surf over an ochre stroke of sand on pale canvas, with tiny figures walking along the sand and two wading",
      },
    ],
    createdAt: "2026-09-12T10:00:00.000Z",
  },
  {
    // PRICE + SOLD, very wide 2:1.
    id: "art_02",
    slug: "harbour-wall",
    title: "Harbour Wall",
    description: [
      "**Size:** 160 x 80 cm",
      "**Medium:** acrylic and marble dust on canvas",
      "**Frame:** unframed, painted edges",
      "",
      "Long horizontal strokes built up in thin layers, then scraped back.",
    ].join("\n"),
    priceMode: "PRICE",
    priceAmount: 310000,
    currency: "EUR",
    status: "SOLD",
    published: true,
    sortOrder: 2,
    images: [
      {
        src: "/placeholders/harbour-wall.webp",
        width: 2400,
        height: 1200,
        alt: "A long thick stroke of near-black and grey-blue paint like a sea wall over pale water, with tiny figures sitting along its top and a small red boat",
      },
    ],
    createdAt: "2026-06-03T10:00:00.000Z",
  },
  {
    // PRICE + AVAILABLE, landscape 3:2, three images (thumbnails).
    id: "art_03",
    slug: "field-notes-i",
    title: "Field Notes I",
    description: [
      "**Size:** 90 x 60 cm",
      "**Medium:** acrylic and texture paste on linen canvas",
      "**Frame:** optional float frame in light or dark wood",
      "",
      "The first in a series of small studies made outdoors. The second image shows the surface up close; the third shows the piece on a wall for scale.",
      "",
      "- Signed on the back",
      "- Ready to hang",
    ].join("\n"),
    priceMode: "PRICE",
    priceAmount: 220000,
    currency: "EUR",
    status: "AVAILABLE",
    published: true,
    sortOrder: 3,
    images: [
      {
        src: "/placeholders/field-notes-i-1.webp",
        width: 2400,
        height: 1600,
        alt: "Thick sage-green and rust knife strokes rolling like hills across a pale canvas, with a line of tiny walkers on the top ridge",
      },
      {
        src: "/placeholders/field-notes-i-2.webp",
        width: 1800,
        height: 1800,
        alt: "Close-up of heavy sage and rust paint ridges, with one figure walking along a ridge and another sitting on the rust slope",
      },
      {
        src: "/placeholders/field-notes-i-3.webp",
        width: 2400,
        height: 1600,
        alt: "The sage and rust hill painting hanging on a plain light grey wall",
      },
    ],
    createdAt: "2026-08-20T10:00:00.000Z",
  },
  {
    // PRICE + SOLD, tall 2:3.
    id: "art_04",
    slug: "tall-grass",
    title: "Tall Grass",
    description: [
      "**Size:** 60 x 90 cm",
      "**Medium:** acrylic on canvas",
      "**Frame:** optional float frame in light or dark wood",
      "",
      "Vertical strokes in yellow-green and straw, painted wet into wet.",
    ].join("\n"),
    priceMode: "PRICE",
    priceAmount: 180000,
    currency: "EUR",
    status: "SOLD",
    published: true,
    sortOrder: 4,
    images: [
      {
        src: "/placeholders/tall-grass.webp",
        width: 1600,
        height: 2400,
        alt: "Tall vertical strokes of yellow-green and deep green rising like grass under a wide pale sky, with tiny figures walking single file along a path at the base",
      },
    ],
    createdAt: "2026-05-14T10:00:00.000Z",
  },
  {
    // PRICE + AVAILABLE, square, with cents so the decimals stay visible.
    id: "art_05",
    slug: "quiet-orchard",
    title: "Quiet Orchard",
    description: [
      "**Size:** 50 x 50 cm",
      "**Medium:** acrylic and texture paste on wood panel",
      "**Frame:** unframed",
      "",
      "Soft, rounded forms in pale pink and olive.",
    ].join("\n"),
    priceMode: "PRICE",
    priceAmount: 64050,
    currency: "EUR",
    status: "AVAILABLE",
    published: true,
    sortOrder: 5,
    images: [
      {
        src: "/placeholders/quiet-orchard.webp",
        width: 2000,
        height: 2000,
        alt: "Round thick olive-green dabs like trees on a pale pink ground above a dark umber stroke, with tiny figures picnicking and strolling between them",
      },
    ],
    createdAt: "2026-09-01T10:00:00.000Z",
  },
  {
    // DISPLAY, square. Has a stored amount that must never be shown.
    // Shares sortOrder 6 with the next piece; the newer one comes first.
    id: "art_06",
    slug: "study-in-umber",
    title: "Study in Umber",
    description: [
      "**Size:** 40 x 40 cm",
      "**Medium:** acrylic and texture paste on linen canvas",
      "",
      "Part of the artist's own collection, shown here but not for sale.",
    ].join("\n"),
    priceMode: "DISPLAY",
    priceAmount: 95000,
    currency: "EUR",
    status: "AVAILABLE",
    published: true,
    sortOrder: 6,
    images: [
      {
        src: "/placeholders/study-in-umber.webp",
        width: 2000,
        height: 2000,
        alt: "A bold diagonal swipe of bone-white paint edged in burnt sienna across an umber ground like a ski slope, with tiny skiers carving tracks down it",
      },
    ],
    createdAt: "2026-03-22T10:00:00.000Z",
  },
  {
    // AUCTION, portrait 3:4. Not offered yet: must render exactly like DISPLAY.
    id: "art_07",
    slug: "weather-front",
    title: "Weather Front",
    description: [
      "**Size:** 90 x 120 cm",
      "**Medium:** acrylic and texture paste on linen canvas",
      "**Frame:** optional float frame in light or dark wood",
      "",
      "A turbulent upper half settling into calm.",
    ].join("\n"),
    priceMode: "AUCTION",
    priceAmount: 400000,
    currency: "EUR",
    status: "AVAILABLE",
    published: true,
    sortOrder: 6,
    images: [
      {
        src: "/placeholders/weather-front.webp",
        width: 1800,
        height: 2400,
        alt: "A big curling wave of thick indigo, storm-grey and white paint, with tiny surfers on its face and swimmers in the calm water below",
      },
    ],
    createdAt: "2026-07-30T10:00:00.000Z",
  },
  {
    // Unpublished draft. Must not appear anywhere on the storefront.
    id: "art_08",
    slug: "untitled-draft",
    title: "Untitled (draft)",
    description: [
      "**Size:** 120 x 90 cm",
      "**Medium:** acrylic on canvas",
      "",
      "Still in progress.",
    ].join("\n"),
    priceMode: "PRICE",
    priceAmount: 120000,
    currency: "EUR",
    status: "AVAILABLE",
    published: false,
    sortOrder: 0,
    images: [
      {
        src: "/placeholders/untitled-draft.webp",
        width: 2400,
        height: 1800,
        alt: "A single thick muted-teal stroke like a swimming pool on off-white canvas, with tiny swimmers and a coral lounger beside it",
      },
    ],
    createdAt: "2026-10-01T10:00:00.000Z",
  },
];
