"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { ShoppingBag, Plus, Minus, X, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuData, MenuProduct } from "@/modules/menus/contract";
import { formatMoney } from "@/modules/products/money";
import { emitMenuEvent } from "@/modules/analytics/client";
import { createCheckoutStore } from "../checkout-store";
import { createCartStore, type CartLine } from "../cart-store";
import { orderDtoSchema, type OrderDto } from "../validation";
const OrderingContext = createContext<{
  enabled: boolean;
  add: (line: Omit<CartLine, "key">) => void;
}>({ enabled: false, add: () => {} });
function credential() {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function estimate(menu: MenuData, line: CartLine) {
  const p = menu.products.find((p) => p.id === line.productId);
  if (!p) return 0n;
  return (
    BigInt(p.priceMinor) +
    menu.modifierGroups
      .filter((g) => p.modifierGroupIds.includes(g.id))
      .flatMap((g) => g.options)
      .filter((o) => line.optionIds.includes(o.id))
      .reduce((sum, o) => sum + BigInt(o.priceDeltaMinor), 0n)
  );
}
export function GuestOrdering({
  data,
  qrToken,
  children,
}: {
  data: MenuData;
  qrToken?: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  const enabled =
    !!qrToken && !!data.context.tableLabel && data.context.orderingEnabled;
  const [store] = useState(() =>
    createCartStore(
      `ravoq:cart:${data.identity.menuId}:${qrToken ?? "browse"}`,
    ),
  );
  const lines = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [checkoutStore] = useState(() =>
    createCheckoutStore(
      `ravoq:checkout:${data.identity.menuId}:${qrToken ?? "browse"}`,
    ),
  );
  const checkout = useSyncExternalStore(
    checkoutStore.subscribe,
    checkoutStore.getSnapshot,
    checkoutStore.getServerSnapshot,
  );
  const receipt = checkout.receipt;
  const locked = pending || !!checkout.attempt;
  const total = lines.reduce(
    (sum, l) => sum + estimate(data, l) * BigInt(l.quantity),
    0n,
  );
  async function submit() {
    if (
      (!enabled && !checkout.attempt) ||
      !qrToken ||
      (!lines.length && !checkout.attempt)
    )
      return;
    setPending(true);
    setError("");
    try {
      const payload = {
        qrToken,
        locale: data.locale,
        notes,
        lines: lines.map((l) => ({
          productId: l.productId,
          optionIds: l.optionIds,
          quantity: l.quantity,
          note: l.note,
          expectedUnitMinor: estimate(data, l).toString(),
        })),
      };
      const outgoing = checkout.attempt ?? {
        ...payload,
        credential: credential(),
        idempotencyKey: crypto.randomUUID(),
      };
      checkoutStore.set({ attempt: outgoing, receipt: null });
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outgoing),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        if (response.status < 500)
          checkoutStore.set({ attempt: null, receipt: null });
        setError(result.error ?? "INTERNAL");
        return;
      }
      checkoutStore.set({
        attempt: null,
        receipt: { id: result.id, credential: outgoing.credential },
      });
      store.set([]);
      setNotes("");
    } catch {
      setError("connectionError");
    } finally {
      setPending(false);
    }
  }
  function add(line: Omit<CartLine, "key">) {
    if (!enabled || locked) return;
    if (lines.length >= 50) {
      setError("cartLimit");
      setOpen(true);
      return;
    }
    store.set([...lines, { ...line, key: crypto.randomUUID() }]);
    emitMenuEvent("CART_ADD", line.productId);
  }
  return (
    <OrderingContext value={{ enabled: enabled && !locked, add }}>
      {children}
      {(enabled || receipt || checkout.attempt) && (
        <button className="cart-bar" onClick={() => setOpen(true)}>
          <ShoppingBag size={20} />
          <span>
            {receipt
              ? t("yourOrder")
              : `${t("viewCart")} · ${lines.reduce((s, l) => s + l.quantity, 0)}`}
          </span>
          <strong>
            {receipt ? (
              <Check size={18} />
            ) : (
              formatMoney(total, data.currency, data.locale)
            )}
          </strong>
        </button>
      )}
      {data.context.orderingEnabled && !enabled && (
        <div className="browse-order-note">{t("scanTableToOrder")}</div>
      )}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="product-dialog cart-dialog">
            <div className="detail-body">
              <Dialog.Close className="dialog-close" aria-label={t("close")}>
                <X size={20} />
              </Dialog.Close>
              <Dialog.Title>
                {t(receipt ? "yourOrder" : "yourCart")}
              </Dialog.Title>
              <Dialog.Description>
                {data.context.tableLabel
                  ? `${t("table")} ${data.context.tableLabel}`
                  : data.restaurant.name}
              </Dialog.Description>
              {receipt ? (
                <>
                  <Receipt
                    id={receipt.id}
                    credential={receipt.credential}
                    locale={data.locale}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      checkoutStore.set({ attempt: null, receipt: null });
                      setOpen(false);
                    }}
                  >
                    {t("continueBrowsing")}
                  </Button>
                </>
              ) : (
                <>
                  {lines.length === 0 ? (
                    <p className="menu-empty">{t("cartEmpty")}</p>
                  ) : (
                    lines.map((line) => {
                      const p = data.products.find(
                        (p) => p.id === line.productId,
                      );
                      return (
                        <div className="cart-line" key={line.key}>
                          <div>
                            <strong>{p?.name ?? t("UNAVAILABLE")}</strong>
                            <small>
                              {formatMoney(
                                estimate(data, line),
                                data.currency,
                                data.locale,
                              )}
                            </small>
                            <small>
                              {data.modifierGroups
                                .flatMap((g) => g.options)
                                .filter((o) => line.optionIds.includes(o.id))
                                .map((o) => o.name)
                                .join(", ")}
                            </small>
                            {line.note && <small>{line.note}</small>}
                          </div>
                          <div className="quantity-stepper">
                            <button
                              disabled={locked}
                              aria-label={`${t("decrease")} · ${p?.name}`}
                              onClick={() =>
                                store.set(
                                  line.quantity === 1
                                    ? lines.filter((l) => l.key !== line.key)
                                    : lines.map((l) =>
                                        l.key === line.key
                                          ? { ...l, quantity: l.quantity - 1 }
                                          : l,
                                      ),
                                )
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <span>{line.quantity}</span>
                            <button
                              disabled={locked || line.quantity === 99}
                              aria-label={`${t("increase")} · ${p?.name}`}
                              onClick={() =>
                                store.set(
                                  lines.map((l) =>
                                    l.key === line.key
                                      ? { ...l, quantity: l.quantity + 1 }
                                      : l,
                                  ),
                                )
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {lines.length > 0 && (
                    <>
                      <label>
                        {t("orderNote")}
                        <textarea
                          value={checkout.attempt?.notes ?? notes}
                          maxLength={500}
                          disabled={locked}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </label>
                      <div className="cart-total">
                        <span>{t("total")}</span>
                        <strong>
                          {formatMoney(total, data.currency, data.locale)}
                        </strong>
                      </div>
                      <p className="muted">
                        <small>{t("payAtRestaurant")}</small>
                      </p>
                      <Button
                        className="cart-submit"
                        disabled={pending}
                        onClick={submit}
                      >
                        {t(pending ? "working" : "sendOrder")}
                      </Button>
                    </>
                  )}
                </>
              )}
              {checkout.attempt && !pending && (
                <p className="notice">{t("retrySameOrder")}</p>
              )}
              {error && (
                <p role="alert" className="notice notice-error">
                  {t(error)}
                  {error === "PRICE_CHANGED" && (
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      {t("reviewPrices")}
                    </Button>
                  )}
                </p>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </OrderingContext>
  );
}
export function OrderSelection({
  product,
  data,
  onAdded,
}: {
  product: MenuProduct;
  data: MenuData;
  onAdded: () => void;
}) {
  const t = useTranslations();
  const ordering = useContext(OrderingContext);
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const groups = data.modifierGroups.filter((g) =>
    product.modifierGroupIds.includes(g.id),
  );
  const unit =
    BigInt(product.priceMinor) +
    groups
      .flatMap((g) => g.options)
      .filter((o) => selected.includes(o.id))
      .reduce((s, o) => s + BigInt(o.priceDeltaMinor), 0n);
  return (
    <div className="order-selection">
      {groups.map((group) => (
        <fieldset key={group.id}>
          <legend>
            {group.name}
            <small>
              {t("chooseOptions", {
                min: group.minSelections,
                max: group.maxSelections,
              })}
            </small>
          </legend>
          {group.options.map((option) => (
            <label className="modifier-option" key={option.id}>
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                disabled={
                  !ordering.enabled || !product.available || !option.available
                }
                onChange={(e) => {
                  setSelected((current) =>
                    e.target.checked
                      ? [...current, option.id]
                      : current.filter((id) => id !== option.id),
                  );
                  setError(false);
                }}
              />
              <span>
                {option.name}
                {!option.available && <small>{t("soldOut")}</small>}
              </span>
              <strong>
                +{" "}
                {formatMoney(
                  option.priceDeltaMinor,
                  data.currency,
                  data.locale,
                )}
              </strong>
            </label>
          ))}
        </fieldset>
      ))}
      {ordering.enabled && product.available && (
        <>
          <label>
            {t("dishNote")}
            <textarea
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="add-order-row">
            <div className="quantity-stepper">
              <button
                aria-label={t("decrease")}
                disabled={quantity === 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button
                aria-label={t("increase")}
                disabled={quantity === 99}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
            <Button
              onClick={() => {
                const valid = groups.every((g) => {
                  const count = g.options.filter((o) =>
                    selected.includes(o.id),
                  ).length;
                  return count >= g.minSelections && count <= g.maxSelections;
                });
                if (!valid) {
                  setError(true);
                  return;
                }
                ordering.add({
                  productId: product.id,
                  optionIds: selected,
                  quantity,
                  note,
                });
                onAdded();
              }}
            >
              {t("addToCart")} ·{" "}
              {formatMoney(unit * BigInt(quantity), data.currency, data.locale)}
            </Button>
          </div>
          {error && (
            <p role="alert" className="notice notice-error">
              {t("selectionRequired")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
export function Receipt({
  id,
  credential,
  locale,
}: {
  id: string;
  credential: string;
  locale: string;
}) {
  const t = useTranslations();
  const [data, setData] = useState<OrderDto | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/orders/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id, credential }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Receipt unavailable");
        const receipt = orderDtoSchema.parse(await response.json());
        if (active) {
          setData(receipt);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    }
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [id, credential]);
  return (
    <section className="receipt">
      <Check size={35} />
      <h3>{data ? `${t("orderNumber")} ${data.number}` : t("orderSent")}</h3>
      {data && (
        <>
          <p className={`order-status status-${data.status.toLowerCase()}`}>
            {t(`status_${data.status}`)}
          </p>
          {data.lines.map((line) => (
            <div className="receipt-line" key={line.id}>
              <span>
                {line.quantity} × {line.name}
              </span>
              <strong>
                {formatMoney(line.totalMinor, data.currency, locale)}
              </strong>
            </div>
          ))}
          <div className="cart-total">
            <span>{t("total")}</span>
            <strong>
              {formatMoney(data.totalMinor, data.currency, locale)}
            </strong>
          </div>
        </>
      )}
      {failed && (
        <p className="notice notice-error">
          <RefreshCw size={14} />
          {t("reconnecting")}
        </p>
      )}
      <p className="muted">{t("receiptKeepOpen")}</p>
      <Link className="text-link" href={`/${locale}/order/${id}`}>
        {t("openReceipt")}
      </Link>
    </section>
  );
}
