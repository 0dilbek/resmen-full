export const premiumTemplateIds = [
  "editorial-magazine",
  "dark-luxury",
  "japanese-minimal",
  "neo-brutalism",
  "scrapbook",
  "uzbek-heritage",
  "brutalist",
  "glass",
  "food-cinema",
  "playing-cards",
  "newspaper",
  "vintage-italian",
  "french-bistro",
  "cyberpunk",
  "terminal",
  "retro-game",
  "comic-book",
  "polaroid",
  "museum",
  "luxury-watch",
  "playlist",
  "screening",
  "stories",
  "swipe",
  "food-journey",
  "khiva-manuscript",
  "oriental-premium",
  "botanical",
  "food-cards-3d",
  "dynamic-brand",
] as const;
export type PremiumId = (typeof premiumTemplateIds)[number];
export const designCategories = [
  "minimal",
  "premium",
  "creative",
  "experimental",
  "entertainment",
  "cultural",
] as const;
export type DesignCategory = (typeof designCategories)[number];
export type Composition =
  | "editorial"
  | "gallery"
  | "folio"
  | "poster"
  | "paper"
  | "heritage"
  | "cinema"
  | "rails"
  | "stories"
  | "swipe"
  | "journey";
export type PremiumDefinition = {
  id: PremiumId;
  name: string;
  category: DesignCategory;
  composition: Composition;
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  fonts: "editorial" | "system" | "mono";
  motion: "subtle" | "smooth" | "playful" | "cinematic";
  supports3D: boolean;
  mode: "light" | "dark";
  radius: "none" | "small" | "soft";
  recommended: "restaurant" | "cafe" | "fastfood" | "bakery";
};
const define = (
  id: PremiumId,
  name: string,
  category: DesignCategory,
  composition: Composition,
  background: string,
  foreground: string,
  primary: string,
  extra: Partial<
    Omit<
      PremiumDefinition,
      | "id"
      | "name"
      | "category"
      | "composition"
      | "background"
      | "foreground"
      | "primary"
    >
  > = {},
): PremiumDefinition => ({
  id,
  name,
  category,
  composition,
  background,
  foreground,
  primary,
  secondary: foreground,
  accent: primary,
  fonts: "editorial",
  motion: "subtle",
  supports3D: false,
  mode: "light",
  radius: "none",
  recommended: "restaurant",
  ...extra,
});
export const premiumCollection: readonly PremiumDefinition[] = [
  define(
    "editorial-magazine",
    "Editorial Magazine",
    "premium",
    "editorial",
    "#f8f4eb",
    "#252a24",
    "#87452f",
  ),
  define(
    "dark-luxury",
    "Dark Luxury",
    "premium",
    "gallery",
    "#141917",
    "#f6efdc",
    "#d9bb82",
    { mode: "dark", motion: "cinematic" },
  ),
  define(
    "japanese-minimal",
    "Japanese Minimal",
    "minimal",
    "folio",
    "#faf9f5",
    "#252923",
    "#96382f",
  ),
  define(
    "neo-brutalism",
    "Neo-Brutalism",
    "creative",
    "poster",
    "#fff9de",
    "#24221f",
    "#913720",
    { fonts: "system", motion: "playful", recommended: "fastfood" },
  ),
  define(
    "scrapbook",
    "Scrapbook",
    "creative",
    "paper",
    "#f7eedc",
    "#493a2d",
    "#724938",
    { motion: "playful", recommended: "bakery" },
  ),
  define(
    "uzbek-heritage",
    "Uzbek Heritage",
    "cultural",
    "heritage",
    "#f8f1e3",
    "#193c46",
    "#15576a",
  ),
  define(
    "brutalist",
    "Brutalist",
    "experimental",
    "poster",
    "#f4f4ef",
    "#191919",
    "#222222",
    { fonts: "system" },
  ),
  define(
    "glass",
    "Glassmorphism",
    "experimental",
    "gallery",
    "#edf3f2",
    "#193d3b",
    "#245950",
    { fonts: "system", motion: "smooth", radius: "soft" },
  ),
  define(
    "food-cinema",
    "Food Cinema",
    "premium",
    "cinema",
    "#131613",
    "#fff1d9",
    "#dfba81",
    { mode: "dark", motion: "cinematic", supports3D: true },
  ),
  define(
    "playing-cards",
    "Playing Cards",
    "creative",
    "gallery",
    "#e9efdf",
    "#253e30",
    "#365744",
    { motion: "playful" },
  ),
  define(
    "newspaper",
    "Newspaper",
    "creative",
    "editorial",
    "#f3efe3",
    "#252521",
    "#484338",
  ),
  define(
    "vintage-italian",
    "Vintage Italian",
    "cultural",
    "paper",
    "#fff4dd",
    "#4d3029",
    "#9c3229",
  ),
  define(
    "french-bistro",
    "French Bistro",
    "premium",
    "folio",
    "#fff7e9",
    "#2e3a45",
    "#334f65",
  ),
  define(
    "cyberpunk",
    "Cyberpunk",
    "experimental",
    "poster",
    "#111a27",
    "#e3f8fa",
    "#5debd9",
    { mode: "dark", fonts: "mono", motion: "cinematic", supports3D: true },
  ),
  define(
    "terminal",
    "Terminal",
    "experimental",
    "folio",
    "#101b15",
    "#daeddc",
    "#95e7ac",
    { mode: "dark", fonts: "mono" },
  ),
  define(
    "retro-game",
    "Retro Game",
    "entertainment",
    "gallery",
    "#20203a",
    "#fbf0cd",
    "#f4cf68",
    { mode: "dark", fonts: "mono", motion: "playful" },
  ),
  define(
    "comic-book",
    "Comic Book",
    "entertainment",
    "poster",
    "#fff8d5",
    "#27221f",
    "#9b2e26",
    { fonts: "system", motion: "playful" },
  ),
  define(
    "polaroid",
    "Polaroid",
    "creative",
    "paper",
    "#eee7dc",
    "#3c3531",
    "#684b3d",
    { recommended: "cafe" },
  ),
  define(
    "museum",
    "Museum Gallery",
    "minimal",
    "gallery",
    "#f8f8f4",
    "#282c2c",
    "#3f5358",
  ),
  define(
    "luxury-watch",
    "Luxury Watch",
    "premium",
    "cinema",
    "#111d21",
    "#f6efe0",
    "#c3d6d0",
    { mode: "dark", supports3D: true },
  ),
  define(
    "playlist",
    "Playlist / Spotify",
    "entertainment",
    "rails",
    "#13211a",
    "#eaf5ec",
    "#91db9f",
    { mode: "dark", fonts: "system", motion: "smooth" },
  ),
  define(
    "screening",
    "Screening / Netflix",
    "entertainment",
    "rails",
    "#19151a",
    "#fff0ed",
    "#f5998b",
    { mode: "dark", fonts: "system", motion: "cinematic" },
  ),
  define(
    "stories",
    "Stories / Instagram",
    "entertainment",
    "stories",
    "#fff7ef",
    "#332d39",
    "#843c6c",
    { fonts: "system", motion: "smooth", radius: "soft" },
  ),
  define(
    "swipe",
    "Swipe Menu",
    "entertainment",
    "swipe",
    "#f4efe4",
    "#263a30",
    "#345e46",
    { fonts: "system", motion: "smooth", radius: "soft" },
  ),
  define(
    "food-journey",
    "Food Journey",
    "creative",
    "journey",
    "#f7f0e4",
    "#343f32",
    "#52633b",
  ),
  define(
    "khiva-manuscript",
    "Khiva Manuscript",
    "cultural",
    "folio",
    "#f2e5c8",
    "#483d2a",
    "#725335",
  ),
  define(
    "oriental-premium",
    "Oriental Premium",
    "cultural",
    "heritage",
    "#24362f",
    "#f7ecd4",
    "#debf86",
    { mode: "dark" },
  ),
  define(
    "botanical",
    "Botanical Cafe",
    "creative",
    "paper",
    "#f0f3e7",
    "#294737",
    "#3e654a",
    { recommended: "cafe" },
  ),
  define(
    "food-cards-3d",
    "3D Food Cards",
    "experimental",
    "gallery",
    "#eef1f3",
    "#263b48",
    "#36586f",
    { fonts: "system", supports3D: true, motion: "playful", radius: "soft" },
  ),
  define(
    "dynamic-brand",
    "Dynamic Brand",
    "minimal",
    "editorial",
    "#f7f6f0",
    "#253b34",
    "#285b49",
    { fonts: "system", supports3D: true, motion: "smooth" },
  ),
];
// Shared composition primitives; each ID has its own art direction stylesheet.
export const premiumTemplates = premiumCollection.map((d) => ({
  ...d,
  premium: true as const,
  family: ["uzbek-heritage", "khiva-manuscript", "oriental-premium"].includes(
    d.id,
  )
    ? ("uzbek" as const)
    : ("minimal" as const),
  variant: 1,
  muted: d.foreground,
  line: d.foreground,
  layout: d.composition,
}));
export function premiumDefinition(id: string) {
  return premiumCollection.find((d) => d.id === id);
}
