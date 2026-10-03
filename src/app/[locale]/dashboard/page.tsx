import { EmptyIllustration } from "@/components/visuals/empty-illustration";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Plus } from "lucide-react";
import { getSession } from "@/modules/auth/server";
import { listRestaurants } from "@/modules/restaurants/queries";
import { Brand } from "@/components/brand";
import { CreateRestaurantForm } from "@/modules/restaurants/components/create-form";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const t = await getTranslations();
  const restaurants = await listRestaurants(session.user.id);
  return (
    <main className="restaurant-picker">
      <header>
        <Brand href={`/${locale}`} />
        <Link className="text-link" href={`/${locale}/account`}>
          {session.user.name}
        </Link>
      </header>
      <div className="picker-heading">
        {!restaurants.length && <EmptyIllustration kind="restaurant" />}
        <span className="eyebrow">RESMEN WORKSPACE</span>
        <h1>{t(restaurants.length ? "workspace" : "emptyRestaurants")}</h1>
        <p className="muted">{t("emptyRestaurantsNote")}</p>
      </div>
      <div className="restaurant-grid">
        {restaurants.map((r) => (
          <Link
            className="restaurant-tile panel"
            key={r.id}
            href={`/${locale}/dashboard/${r.id}`}
          >
            <div className="restaurant-monogram">{r.name.slice(0, 1)}</div>
            <h2>{r.name}</h2>
            <span className="muted">/r/{r.slug}</span>
            <ArrowUpRight size={20} />
          </Link>
        ))}
      </div>
      <section className="panel create-restaurant">
        <h2>
          <Plus size={20} />
          {t("newRestaurant")}
        </h2>
        <CreateRestaurantForm />
      </section>
    </main>
  );
}
