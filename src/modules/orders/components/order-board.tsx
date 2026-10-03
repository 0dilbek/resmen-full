"use client";
import { EmptyIllustration } from "@/components/visuals/empty-illustration";
import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { RefreshCw, Clock, ArrowRight, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/modules/products/money";
import {
  boardDtoSchema,
  orderStatuses,
  transitions,
  type OrderBoardDto,
  type OrderDto,
  type OrderStatus,
} from "../validation";
class BoardError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
export function OrderBoard(props: {
  restaurantId: string;
  branchId: string;
  initial: OrderBoardDto;
  timezone: string;
}) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <Board {...props} />
    </QueryClientProvider>
  );
}
function Board({
  restaurantId,
  branchId,
  initial,
  timezone,
}: {
  restaurantId: string;
  branchId: string;
  initial: OrderBoardDto;
  timezone: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const client = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "OPEN">("OPEN");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["orders", restaurantId, branchId, filter, page],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/orders/${restaurantId}/${branchId}?status=${filter}&page=${page}`,
        { signal, cache: "no-store" },
      );
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new BoardError(error.error ?? "INTERNAL", response.status);
      }
      return boardDtoSchema.parse(await response.json());
    },
    initialData: filter === "OPEN" && page === 1 ? initial : undefined,
    refetchInterval: (query) =>
      query.state.error instanceof BoardError &&
      [401, 403, 404].includes(query.state.error.status)
        ? false
        : query.state.error
          ? 15000
          : 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (count, error) =>
      !(error instanceof BoardError && error.status < 500) && count < 2,
    staleTime: 3000,
  });
  const mutation = useMutation({
    mutationFn: async (input: {
      order: OrderDto;
      nextStatus: OrderStatus;
      reason: string;
    }) => {
      const response = await fetch(`/api/orders/${restaurantId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: input.order.id,
          expectedVersion: input.order.version,
          nextStatus: input.nextStatus,
          reason: input.reason,
          requestId: crypto.randomUUID(),
        }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new BoardError(error.error ?? "INTERNAL", response.status);
      }
    },
    retry: false,
    onSuccess: async () => {
      setReason("");
      await client.invalidateQueries({
        queryKey: ["orders", restaurantId, branchId],
      });
    },
    onError: () => {
      void client.invalidateQueries({
        queryKey: ["orders", restaurantId, branchId],
      });
    },
  });
  const data = query.data;
  const active = data?.orders.find((o) => o.id === selected) ?? data?.orders[0];
  const terminalError =
    query.error instanceof BoardError &&
    [401, 403, 404].includes(query.error.status);
  if (terminalError && query.error)
    return (
      <p role="alert" className="notice notice-error">
        {t(query.error.message)}
      </p>
    );
  return (
    <>
      <div className="cashier-toolbar">
        <div className="sync-status" role="status">
          {query.isError ? (
            <>
              <WifiOff size={16} />
              {t("reconnecting")}
            </>
          ) : (
            <>
              <span className="dot" />
              {t("liveOrders")}
            </>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw size={15} />
          {t("refresh")}
        </Button>
      </div>
      <div className="order-filters">
        {(["OPEN", ...orderStatuses] as const).map((status) => (
          <button
            key={status}
            aria-pressed={filter === status}
            className={filter === status ? "active" : ""}
            onClick={() => {
              setFilter(status);
              setPage(1);
              setSelected(null);
            }}
          >
            {t(`status_${status}`)}
            {status !== "OPEN" && <span>{data?.counts[status] ?? 0}</span>}
          </button>
        ))}
      </div>
      {mutation.isError && (
        <p role="alert" className="notice notice-error">
          {t(mutation.error.message)}
        </p>
      )}
      {!data ? (
        <p className="notice" role="status">
          {t("working")}
        </p>
      ) : data.orders.length === 0 ? (
        <section className="panel empty-state">
          <EmptyIllustration kind="order" />
          <h2>{t("noOrders")}</h2>
          <p className="muted">{t("noOrdersHint")}</p>
        </section>
      ) : (
        <div className="cashier-layout">
          <div className="order-list">
            {data.orders.map((order) => (
              <button
                className={`order-summary ${active?.id === order.id ? "selected" : ""}`}
                key={order.id}
                onClick={() => {
                  setSelected(order.id);
                  setReason("");
                  mutation.reset();
                }}
              >
                <div>
                  <strong>#{order.number}</strong>
                  <span
                    className={`order-status status-${order.status.toLowerCase()}`}
                  >
                    {t(`status_${order.status}`)}
                  </span>
                </div>
                <h3>
                  {t("table")} {order.tableLabel}
                </h3>
                <div>
                  <span>
                    <Clock size={12} />{" "}
                    {new Intl.DateTimeFormat(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone,
                    }).format(new Date(order.createdAt))}
                  </span>
                  <strong>
                    {formatMoney(order.totalMinor, order.currency, locale)}
                  </strong>
                </div>
              </button>
            ))}
          </div>
          {active && (
            <section className="panel order-detail">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {t("table")} {active.tableLabel}
                  </span>
                  <h2>
                    {t("orderNumber")} {active.number}
                  </h2>
                </div>
                <span
                  className={`order-status status-${active.status.toLowerCase()}`}
                >
                  {t(`status_${active.status}`)}
                </span>
              </div>
              {active.lines.map((line) => (
                <div className="cashier-line" key={line.id}>
                  <div>
                    <strong>
                      {line.quantity} × {line.name}
                    </strong>
                    {line.modifiers.map((m, i) => (
                      <small key={i}>
                        {m.groupName}: {m.name}
                      </small>
                    ))}
                    {line.note && <p className="item-note">{line.note}</p>}
                  </div>
                  <strong>
                    {formatMoney(line.totalMinor, active.currency, locale)}
                  </strong>
                </div>
              ))}
              {active.notes && <p className="order-notes">{active.notes}</p>}
              <div className="cart-total">
                <span>{t("total")}</span>
                <strong>
                  {formatMoney(active.totalMinor, active.currency, locale)}
                </strong>
              </div>
              <div className="order-next-actions">
                {transitions[active.status]
                  .filter((s) => s !== "CANCELLED")
                  .map((status) => (
                    <Button
                      key={status}
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          order: active,
                          nextStatus: status,
                          reason: "",
                        })
                      }
                    >
                      {t(`action_${status}`)}
                      <ArrowRight size={17} />
                    </Button>
                  ))}
              </div>
              {transitions[active.status].includes("CANCELLED") && (
                <details className="cancel-order">
                  <summary>{t("cancelOrder")}</summary>
                  <label>
                    {t("cancelReason")}
                    <input
                      maxLength={300}
                      minLength={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <Button
                    variant="danger"
                    disabled={mutation.isPending || reason.trim().length < 3}
                    onClick={() =>
                      mutation.mutate({
                        order: active,
                        nextStatus: "CANCELLED",
                        reason,
                      })
                    }
                  >
                    {t("confirmCancel")}
                  </Button>
                </details>
              )}
              <ol className="order-history">
                {active.events.map((event, i) => (
                  <li key={i}>
                    <span>{t(`status_${event.status}`)}</span>
                    <time>
                      {new Intl.DateTimeFormat(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: timezone,
                      }).format(new Date(event.createdAt))}
                    </time>
                    {event.reason && <small>{event.reason}</small>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
      {data && (
        <nav className="pagination">
          <Button
            variant="outline"
            disabled={page === 1 || query.isFetching}
            onClick={() => setPage(page - 1)}
          >
            {t("previous")}
          </Button>
          <span>
            {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))} ·{" "}
            {data.total}
          </span>
          <Button
            variant="outline"
            disabled={page * data.pageSize >= data.total || query.isFetching}
            onClick={() => setPage(page + 1)}
          >
            {t("next")}
          </Button>
        </nav>
      )}
    </>
  );
}
