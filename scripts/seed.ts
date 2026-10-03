import { eq } from "drizzle-orm";
try {
  process.loadEnvFile();
} catch {
  /* Environment may be supplied by the operator. */
}
async function main() {
  if (process.env.APP_ENV !== "development" && process.env.APP_ENV !== "test")
    throw new Error("Demo seeding requires APP_ENV=development or test");
  const { db, pool } = await import("../src/infrastructure/db");
  const { restaurants, restaurantSettings, restaurantSlugs } =
    await import("../src/modules/restaurants/schema");
  const { branches, branchSlugs } =
    await import("../src/modules/branches/schema");
  const { menus } = await import("../src/modules/menus/schema");
  const { categories, categoryTranslations } =
    await import("../src/modules/categories/schema");
  const { products, productTranslations } =
    await import("../src/modules/products/schema");
  const tenant = "d0000000-0000-4000-8000-000000000001",
    branch = "d0000000-0000-4000-8000-000000000002",
    menu = "d0000000-0000-4000-8000-000000000003";
  try {
    const [existing] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.slug, "navroz"));
    if (existing) {
      if (existing.id !== tenant) throw new Error("Demo slug is already owned");
      console.log("Demo already exists; existing data preserved.");
      return;
    }
    await db.transaction(async (tx) => {
      await tx.insert(restaurants).values({
        id: tenant,
        name: "Navro‘z",
        slug: "navroz",
        status: "ACTIVE",
        description:
          "Zamonaviy dasturxon. An’anaviy mehmondo‘stlik. • Seasonal Uzbek cooking, made to share.",
        address: "Toshkent · Demo restaurant",
      });
      await tx.insert(restaurantSettings).values({
        restaurantId: tenant,
        defaultLocale: "uz",
        enabledLocales: ["uz", "ru", "en"],
        currency: "UZS",
        orderingEnabled: false,
      });
      await tx
        .insert(restaurantSlugs)
        .values({ restaurantId: tenant, slug: "navroz" });
      await tx.insert(branches).values({
        id: branch,
        restaurantId: tenant,
        name: "Courtyard",
        slug: "main",
        isDefault: true,
      });
      await tx
        .insert(branchSlugs)
        .values({ restaurantId: tenant, branchId: branch, slug: "main" });
      await tx.insert(menus).values({
        id: menu,
        restaurantId: tenant,
        branchId: branch,
        published: true,
      });
      const categoryNames = [
        ["Asosiy taomlar", "Горячие блюда", "From the kitchen"],
        ["Salatlar", "Салаты", "Fresh & seasonal"],
        ["Ichimliklar", "Напитки", "At the tea table"],
      ];
      const categoryIds: string[] = [];
      for (const [i, names] of categoryNames.entries()) {
        const [cat] = await tx
          .insert(categories)
          .values({ restaurantId: tenant, menuId: menu, sortOrder: i })
          .returning();
        categoryIds.push(cat.id);
        for (const [j, locale] of (["uz", "ru", "en"] as const).entries())
          await tx.insert(categoryTranslations).values({
            restaurantId: tenant,
            categoryId: cat.id,
            locale,
            name: names[j],
          });
      }
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
      ];
      for (const [i, item] of items.entries()) {
        const [product] = await tx
          .insert(products)
          .values({
            restaurantId: tenant,
            menuId: menu,
            categoryId: categoryIds[item.cat],
            priceMinor: BigInt(item.price) * 100n,
            currency: "UZS",
            published: true,
            available: item.available ?? true,
            featured: item.featured ?? false,
            allergens: item.allergens ?? [],
            sortOrder: i,
          })
          .returning();
        for (const [j, locale] of (["uz", "ru", "en"] as const).entries())
          await tx.insert(productTranslations).values({
            restaurantId: tenant,
            productId: product.id,
            locale,
            name: item.names[j],
            description: item.descs[j],
          });
      }
    });
    console.log(
      "Demo ready: /r/navroz/main/en. No login credentials were created.",
    );
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exitCode = 1;
});
