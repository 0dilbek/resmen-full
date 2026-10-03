import { menuDataSchema } from "./contract";
import { defaultTheme } from "@/modules/templates/config";
import type { TemplateId } from "@/modules/templates/registry";
import { locales, type Locale } from "@/i18n/config";
const id = (n: number) =>
  `d0000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
import { demoAdditions } from "./demo-additions";
const categoryNames = [
  ["Asosiy taomlar", "Горячие блюда", "Main courses"],
  ["Salatlar", "Салаты", "Salads"],
  ["Ichimliklar", "Напитки", "Drinks"],
  ["Nonushta", "Завтраки", "Breakfast"],
  ["Sho‘rvalar", "Супы", "Soups"],
  ["Pitsa", "Пицца", "Pizza"],
  ["Burgerlar", "Бургеры", "Burgers"],
  ["Shirinliklar", "Десерты", "Desserts"],
  ["Qahva", "Кофе", "Coffee"],
];
const items = [
  {
    cat: 0,
    names: ["To‘y oshi", "Праздничный плов", "Celebration plov"],
    descs: [
      "Lazer guruchi, mol go‘shti, sariq sabzi va no‘xat.",
      "Рис лазер, говядина, жёлтая морковь и нут.",
      "Lazer rice, slow-cooked beef, golden carrots and chickpeas.",
    ],
    price: 48000,
    featured: true,
  },
  {
    cat: 0,
    names: ["Tandir somsa", "Тандырная самса", "Tandoor samsa"],
    descs: [
      "Qatlamali xamirda shirali mol go‘shti va piyoz.",
      "Слоёное тесто с сочной говядиной и луком.",
      "Flaky pastry filled with seasoned beef and sweet onion.",
    ],
    price: 14000,
    allergens: ["gluten"],
  },
  {
    cat: 0,
    names: ["Manti", "Манты", "Hand-folded manti"],
    descs: [
      "Bug‘da pishirilgan, qatiq bilan tortiladi.",
      "На пару, подаются с домашним катыком.",
      "Delicate steamed dumplings, served with cultured yoghurt.",
    ],
    price: 42000,
    allergens: ["gluten", "milk"],
  },
  {
    cat: 0,
    names: ["Sabzavotli lag‘mon", "Овощной лагман", "Garden lagman"],
    descs: [
      "Qo‘lda cho‘zilgan ugra va mavsumiy sabzavotlar.",
      "Лапша ручной работы и сезонные овощи.",
      "Hand-pulled noodles with a colourful seasonal vegetable broth.",
    ],
    price: 38000,
    allergens: ["gluten"],
    available: false,
  },
  {
    cat: 1,
    names: ["Achchiq-chuchuk", "Ачичук", "Achichuk salad"],
    descs: [
      "Yupqa to‘g‘ralgan pomidor, piyoz va rayhon.",
      "Тонко нарезанные помидоры, лук и базилик.",
      "Ripe tomatoes, fine onion and fragrant purple basil.",
    ],
    price: 18000,
  },
  {
    cat: 1,
    names: ["Suzma", "Сузьма", "Suzma & herbs"],
    descs: [
      "Yangi ko‘katlar va non bilan.",
      "С зеленью и свежей лепёшкой.",
      "Thick yoghurt, fresh herbs and warm bread.",
    ],
    price: 16000,
    allergens: ["milk", "gluten"],
  },
  {
    cat: 2,
    names: ["Ko‘k choy", "Зелёный чай", "Green tea"],
    descs: [
      "Choynakda tortiladi. Suhbat uchun bir lahza.",
      "Подаётся в чайнике. Время для беседы.",
      "A pot to share. A moment to slow down.",
    ],
    price: 12000,
  },
  {
    cat: 2,
    names: ["Uy limonadi", "Домашний лимонад", "House lemonade"],
    descs: [
      "Limon, yalpiz va ozgina asal.",
      "Лимон, мята и немного мёда.",
      "Fresh lemon, mint and a little honey.",
    ],
    price: 22000,
    featured: true,
  },
  ...demoAdditions,
];

// Immutable public showcase content: no database account, tenant, or production seed is needed.
export function demoMenu(locale: Locale, templateId: TemplateId) {
  const l = locales.indexOf(locale);
  return menuDataSchema.parse({
    contractVersion: 1,
    identity: {
      restaurantId: id(1),
      branchId: id(2),
      menuId: id(3),
      canonicalPath: `/${locale}/templates/${templateId}`,
    },
    restaurant: {
      name: "Navro‘z",
      description: [
        "Zamonaviy dasturxon. An’anaviy mehmondo‘stlik.",
        "Современный стол. Традиционное гостеприимство.",
        "Seasonal Uzbek cooking, made to share.",
      ][l],
      phone: "",
      address: [
        "Toshkent · Namuna",
        "Ташкент · Демонстрация",
        "Tashkent · Demo restaurant",
      ][l],
    },
    context: {
      branchName: ["Hovli", "Внутренний двор", "Courtyard"][l],
      timezone: "Asia/Tashkent",
      orderingEnabled: false,
    },
    locale,
    defaultLocale: "uz",
    enabledLocales: ["uz", "ru", "en"],
    currency: "UZS",
    contentRevision: 2,
    theme: { config: defaultTheme(templateId), revisionId: "showcase-v2" },
    categories: categoryNames.map((names, i) => ({
      id: id(10 + i),
      name: names[l],
      sortOrder: i,
      productIds: items.flatMap((item, j) =>
        item.cat === i ? [id(100 + j)] : [],
      ),
    })),
    products: items.map((item, i) => ({
      id: id(100 + i),
      categoryId: id(10 + item.cat),
      name: item.names[l],
      description: item.descs[l],
      ingredients: item.descs[l],
      priceMinor: String(item.price * 100),
      available: item.available ?? true,
      featured: item.featured ?? false,
      allergens: item.allergens ?? [],
      images: [
        {
          id: id(200 + i),
          url: `/branding/illustrations/dish-${i + 1}.svg`,
          alt: item.names[l],
          width: 960,
          height: 720,
        },
      ],
      modifierGroupIds: [],
    })),
    modifierGroups: [],
  });
}
