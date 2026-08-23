// Pure content shape + defaults + merge logic -- deliberately has zero
// Supabase/Next imports (unlike src/lib/queries/site-content.ts, which
// re-exports these and adds the actual DB fetch) so it can be unit-tested
// directly with Vitest and imported from client components without pulling
// in server-only code.
//
// Everything here has a real default (the site's original copy) so an empty
// or partially-filled DB row -- day one, or an admin who's only edited a
// few fields -- never blanks out the live storefront. getSiteContent()
// always deep-merges the DB's `content` JSON over these defaults; nothing
// in the app should ever read the raw DB row directly.
export type SiteContent = {
  brand: {
    logoText: string;
    logoImageUrl: string | null;
    faviconUrl: string | null;
    accentEmoji: string;
    tagline: string;
    paymentBadgeText: string | null;
  };
  brandColors: {
    primary: string;
    primaryDeep: string;
    secondary: string;
    secondaryLight: string;
    accent: string;
  };
  hero: {
    headlineLine1: string;
    headlineLine2: string;
    subheadline: string;
    ctaPrimaryText: string;
    ctaSecondaryText: string;
    desktopVideoUrl: string;
    desktopImageUrl: string;
    mobileImageUrl: string;
  };
  story: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    paragraph1: string;
    paragraph2: string;
    stats: { value: number; suffix: string; label: string }[];
  };
  trustBar: {
    items: string[];
  };
  whyChooseUs: {
    eyebrow: string;
    title: string;
    reasons: { title: string; body: string }[];
  };
  storyBanner: {
    heading: string;
    body: string;
    videoUrl: string;
    mobileImageUrl: string;
  };
  delivery: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  newsletter: {
    heading: string;
    body: string;
    successMessage: string;
  };
  faqFallback: { id: string; question: string; answer: string }[];
  featuredCollection: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  footer: {
    tagline: string;
    copyrightSuffix: string;
  };
  emptyStates: {
    cartTitle: string;
    cartSubtitle: string;
    productsEmpty: string;
    notFoundTitle: string;
    notFoundBody: string;
  };
  productsPage: {
    title: string;
    intro: string;
    metaDescription: string;
  };
  loyaltyProgram: {
    name: string;
    currencySingular: string;
    currencyPlural: string;
    currencyTitleCase: string;
    emoji: string;
  };
  reviewCategories: {
    tasteLabel: string;
    freshnessLabel: string;
    packagingLabel: string;
    deliveryLabel: string;
  };
  aiAssistant: {
    categoryDescription: string;
    productSingular: string;
    productPlural: string;
    damagedItemNote: string;
  };
  emailBrand: {
    headerText: string;
    footerText: string;
  };
  siteMeta: {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    ogSubtitle: string;
    ogTagline: string;
  };
};

// Mirrors the row seeded by the add_site_content_cms migration -- keep in
// sync if that seed ever changes. This is what a fresh/empty DB row falls
// back to, so it must be a complete, valid SiteContent, not partial.
export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    logoText: "TheAamGhar",
    logoImageUrl: null,
    faviconUrl: null,
    accentEmoji: "🥭",
    tagline: "Premium Pakistani mangoes delivered fresh to your doorstep.",
    paymentBadgeText: "COD Available",
  },
  brandColors: {
    primary: "#ff6b00",
    primaryDeep: "#e55a00",
    secondary: "#2d5a27",
    secondaryLight: "#3a7a33",
    accent: "#ffd700",
  },
  hero: {
    headlineLine1: "Picked This Morning.",
    headlineLine2: "On Your Table by Tomorrow.",
    subheadline:
      "Premium Pakistani mangoes, hand-cut to order in our own orchards in Muzaffargarh — Pakistan's City of Mangoes — and on your doorstep within 24 hours, not weeks in cold storage.",
    ctaPrimaryText: "Shop This Harvest",
    ctaSecondaryText: "Meet the Orchard",
    desktopVideoUrl: "/videos/mango-branch-closeup.mp4",
    desktopImageUrl: "",
    mobileImageUrl: "/images/hero-mango-mobile.jpg",
  },
  story: {
    eyebrow: "Our Story",
    titleLine1: "Three Generations.",
    titleLine2: "One Orchard. Zero Shortcuts.",
    paragraph1:
      "Our family has cultivated mangoes in the sun-drenched orchards of Muzaffargarh — officially recognised as Pakistan's City of Mangoes — for over three decades. Nothing is picked until it's ready, and nothing sits in storage waiting for an order. That's the whole trick.",
    paragraph2:
      "We work directly with over 200 farming families, paying fair prices and practicing sustainable agriculture. When you order from TheAamGhar, that order goes straight back into the same orchards it came from.",
    stats: [
      { value: 200, suffix: "+", label: "Farming Families" },
      { value: 30, suffix: "", label: "Years, One Orchard" },
      { value: 50, suffix: "K+", label: "Happy Customers" },
    ],
  },
  trustBar: {
    items: [
      "Rated by Real Customers",
      "24-Hour Fresh Delivery",
      "100% Naturally Ripened",
      "Cash on Delivery",
      "3 Generations Farming",
    ],
  },
  whyChooseUs: {
    eyebrow: "Why TheAamGhar",
    title: "Not Just Another Fruit Seller",
    reasons: [
      {
        title: "Freshly Harvested",
        body: "Every order is picked only after it's placed -- nothing sits waiting in cold storage for a buyer.",
      },
      {
        title: "No Artificial Ripening",
        body: "No calcium carbide, no chemical gas rooms. Mangoes ripen naturally, on their own schedule.",
      },
      {
        title: "Farm Direct",
        body: "From our own orchards in Muzaffargarh straight to your door -- no middlemen, no markup layers.",
      },
      {
        title: "Premium Packaging",
        body: "Cushioned, ventilated boxes built to survive the trip and arrive looking as good as they taste.",
      },
    ],
  },
  storyBanner: {
    heading: "Our Freshness Promise",
    body: "Every mango is hand-cut to order in our own gardens and delivered within 24 hours — no cold storage, no shortcuts. Not happy with the ripeness or quality on arrival? Message us and we'll make it right, no forms, no hassle.",
    videoUrl: "/videos/mango-knife-garden.mp4",
    mobileImageUrl: "/images/freshness-mango-mobile.jpg",
  },
  delivery: {
    eyebrow: "Nationwide Delivery",
    title: "Wherever You Are, Fresh Follows",
    subtitle: "24-hour delivery to every major city across Pakistan -- Cash on Delivery, always.",
  },
  newsletter: {
    heading: "Never Miss Mango Season",
    body: "Join our list for harvest updates, early access, and season-start alerts.",
    successMessage: "🥭 You're on the list -- see you next harvest.",
  },
  faqFallback: [
    {
      id: "payment",
      question: "How do I pay?",
      answer: "Cash on Delivery only -- you pay when your box arrives, after you've had a chance to inspect it.",
    },
    {
      id: "delivery-time",
      question: "How fast is delivery?",
      answer: "Usually next-day, and same-day if you order before 3pm -- anywhere in Pakistan.",
    },
    {
      id: "tracking",
      question: "Can I track my order?",
      answer: "Yes -- track it at /track with your order number, or just ask our AI chat to track it for you.",
    },
    {
      id: "quality",
      question: "What if a mango arrives unripe or damaged?",
      answer: "Message us on WhatsApp with your order number and we'll make it right -- no forms, no hassle.",
    },
  ],
  featuredCollection: {
    eyebrow: "This Season's Harvest",
    title: "The Featured Collection",
    subtitle: "Every variety below was on the tree this week -- once it's gone this season, it's gone.",
  },
  footer: {
    tagline: "Premium Pakistani mangoes delivered fresh to your doorstep.",
    copyrightSuffix: "All rights reserved. Made with 🥭 in Pakistan.",
  },
  emptyStates: {
    cartTitle: "Your basket is empty",
    cartSubtitle: "Add some mangoes to get started!",
    productsEmpty: "No products available right now — check back soon.",
    notFoundTitle: "Page Not Found",
    notFoundBody: "This mango must have rolled off the shelf — the page you're looking for doesn't exist.",
  },
  productsPage: {
    title: "All Mangoes",
    intro: "Every variety currently in season, hand-picked and delivered fresh.",
    metaDescription:
      "Browse every mango variety we currently have in season -- Sindhri, Chaunsa, Anwar Ratol and more, delivered fresh across Pakistan.",
  },
  loyaltyProgram: {
    name: "Mango Rewards",
    currencySingular: "mango credit",
    currencyPlural: "mango credits",
    currencyTitleCase: "Mango Credits",
    emoji: "🥭",
  },
  reviewCategories: {
    tasteLabel: "Taste",
    freshnessLabel: "Freshness",
    packagingLabel: "Packaging",
    deliveryLabel: "Delivery",
  },
  aiAssistant: {
    categoryDescription: "premium Pakistani mangoes and other produce",
    productSingular: "mango",
    productPlural: "mangoes",
    damagedItemNote: "If a mango arrives unripe, damaged, or wrong, customers should contact support via WhatsApp",
  },
  emailBrand: {
    headerText: "TheAamGhar",
    footerText: "TheAamGhar — Premium Pakistani Mangoes",
  },
  siteMeta: {
    defaultTitle: "TheAamGhar — Premium Pakistani Mangoes",
    titleTemplate: "%s | TheAamGhar",
    defaultDescription:
      "Premium Pakistani mangoes, handpicked at peak ripeness from our orchards in Muzaffargarh — Pakistan's City of Mangoes. Delivered fresh within 24 hours, Cash on Delivery.",
    ogSubtitle: "Premium Pakistani Mangoes",
    ogTagline: "Picked this morning · Delivered tomorrow · Cash on Delivery",
  },
};

// Deep-merges `override` onto `base`, one level of nesting at a time --
// plain objects merge key-by-key, anything else (arrays, strings, numbers,
// null) replaces wholesale. Arrays replace rather than concatenate/merge-by-
// index: an admin editing story.stats sends the whole new array, not a
// sparse patch, so index-merging would leave stale trailing entries behind.
export function mergeSiteContent(
  base: SiteContent,
  override: Partial<SiteContent> | null | undefined
): SiteContent {
  if (!override || typeof override !== "object") return base;
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override) as (keyof SiteContent)[]) {
    const overrideValue = override[key];
    const baseValue = base[key];
    if (
      overrideValue &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue) &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      result[key] = { ...baseValue, ...overrideValue };
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  }
  return result as SiteContent;
}
