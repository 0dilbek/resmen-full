import { AppError } from "@/infrastructure/errors";
import type { MenuData } from "@/modules/menus/contract";
import type { CreateOrderInput } from "./validation";
// Input is a server-projected menu snapshot when used for checkout. UI estimates do not authorize an order.
export function quoteOrder(menu: MenuData, lines: CreateOrderInput["lines"]) {
  let total = 0n;
  const items = lines.map((line) => {
    const product = menu.products.find((p) => p.id === line.productId);
    if (!product || !product.available) throw new AppError("UNAVAILABLE", 409);
    const groups = menu.modifierGroups.filter((g) =>
      product.modifierGroupIds.includes(g.id),
    );
    const selected = groups.flatMap((group) =>
      group.options
        .filter((o) => line.optionIds.includes(o.id) && o.available)
        .map((o) => ({ ...o, groupId: group.id, groupName: group.name })),
    );
    if (selected.length !== line.optionIds.length)
      throw new AppError("INVALID_INPUT");
    for (const group of groups) {
      const count = selected.filter((o) => o.groupId === group.id).length;
      if (count < group.minSelections || count > group.maxSelections)
        throw new AppError("INVALID_INPUT");
    }
    const unit =
      BigInt(product.priceMinor) +
      selected.reduce((sum, o) => sum + BigInt(o.priceDeltaMinor), 0n);
    if (unit.toString() !== line.expectedUnitMinor)
      throw new AppError("PRICE_CHANGED", 409);
    const lineTotal = unit * BigInt(line.quantity);
    total += lineTotal;
    return {
      productId: product.id,
      name: product.name,
      quantity: line.quantity,
      unitMinor: unit,
      totalMinor: lineTotal,
      note: line.note,
      modifiers: selected.map((o) => ({
        optionId: o.id,
        name: o.name,
        groupName: o.groupName,
        priceDeltaMinor: BigInt(o.priceDeltaMinor),
      })),
    };
  });
  if (total > 99999999999999n) throw new AppError("INVALID_INPUT");
  return { items, total };
}
