import { getTranslations } from "next-intl/server";
import { workspace } from "@/modules/restaurants/queries";
import { orderBoard } from "@/modules/orders/server";
import { OrderBoard } from "@/modules/orders/components/order-board";
import { BranchSwitcher } from "@/components/shell/branch-switcher";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { restaurantId } = await params;
  const w = await workspace(
    restaurantId,
    "order:read",
    (await searchParams).branch,
  );
  const initial = await orderBoard(restaurantId, w.branch.id, {
    page: 1,
    status: "OPEN",
  });
  const t = await getTranslations();
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">{w.branch.name}</p>
          <h1>{t("orders")}</h1>
        </div>
        <BranchSwitcher branches={w.branches} selected={w.branch.id} />
      </div>
      <OrderBoard
        key={w.branch.id}
        restaurantId={restaurantId}
        branchId={w.branch.id}
        initial={initial}
        timezone={w.branch.timezone}
      />
    </>
  );
}
