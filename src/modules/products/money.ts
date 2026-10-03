export function parseMoney(value: string): bigint {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error("INVALID_MONEY");
  const [whole, fraction = ""] = value.split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (amount > 9999999999n) throw new Error("INVALID_MONEY");
  return amount;
}
export function inputMoney(value: bigint | string) {
  const amount = BigInt(value);
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
}
export function formatMoney(
  minor: string | bigint,
  currency: string,
  locale: string,
) {
  return new Intl.NumberFormat(locale === "uz" ? "uz-UZ" : locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(minor) / 100);
}
