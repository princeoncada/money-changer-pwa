export type CurrencyType = {
  code: string;
  name: string;
  symbol: string;
};

const currencyTypesKey = "money-changer-pwa-currency-types";

const currencyAliases: Record<string, string> = {
  IR: "IDR",
  "INDONESIAN RUPIAH": "IDR",
  RUPIAH: "IDR"
};

export const BASE_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "JD" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "OMR", name: "Omani Rial", symbol: "ر.ع." },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" }
] satisfies CurrencyType[];

export function normalizeCurrencyCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  return currencyAliases[normalizedCode] ?? normalizedCode.slice(0, 3);
}

export function loadCurrencyTypes(): CurrencyType[] {
  if (typeof window === "undefined") return BASE_CURRENCIES;

  try {
    const stored = window.localStorage.getItem(currencyTypesKey);
    if (!stored) return BASE_CURRENCIES;

    const parsed = JSON.parse(stored) as CurrencyType[];
    const validStored = Array.isArray(parsed)
      ? parsed
          .map((currency) => ({
            code: normalizeCurrencyCode(currency.code || ""),
            name: String(currency.name || "").trim(),
            symbol: String(currency.symbol || "").trim()
          }))
          .filter((currency) => currency.code.length === 3 && currency.name && currency.symbol)
      : [];

    const byCode = new Map<string, CurrencyType>();
    BASE_CURRENCIES.forEach((currency) => byCode.set(currency.code, currency));
    validStored.forEach((currency) => byCode.set(currency.code, currency));

    return Array.from(byCode.values());
  } catch {
    return BASE_CURRENCIES;
  }
}

export function saveCurrencyTypes(currencies: CurrencyType[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(currencyTypesKey, JSON.stringify(currencies, null, 2));
}

export function getCurrencyByCode(code: string) {
  const normalizedCode = normalizeCurrencyCode(code);

  return loadCurrencyTypes().find((currency) => currency.code === normalizedCode);
}

export function getCurrencySymbol(code: string) {
  return getCurrencyByCode(code)?.symbol ?? code;
}

export function getCurrencyLabel(code: string) {
  const currency = getCurrencyByCode(code);

  return currency ? `${currency.code} - ${currency.name}` : code;
}

export function isAllowedCurrency(code: string) {
  return Boolean(getCurrencyByCode(code));
}
