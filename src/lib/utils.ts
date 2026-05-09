import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getCurrencySymbol } from "@/lib/currencies"

export type AppPreferences = {
  encodeDate: string
  recordsDateFilter: {
    from: string
    to: string
  }
  totalsDateFilter: {
    from: string
    to: string
  }
}

const preferencesKey = "money-changer-pwa-preferences"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function defaultAppPreferences(): AppPreferences {
  const today = todayLocal()

  return {
    encodeDate: today,
    recordsDateFilter: {
      from: today,
      to: today
    },
    totalsDateFilter: {
      from: today,
      to: today
    }
  }
}

export function loadAppPreferences(): AppPreferences {
  const defaults = defaultAppPreferences()

  if (typeof window === "undefined") return defaults

  try {
    const stored = window.localStorage.getItem(preferencesKey)
    if (!stored) return defaults

    const parsed = JSON.parse(stored) as Partial<AppPreferences>

    return {
      encodeDate: parsed.encodeDate || defaults.encodeDate,
      recordsDateFilter: {
        from: parsed.recordsDateFilter?.from || defaults.recordsDateFilter.from,
        to: parsed.recordsDateFilter?.to || defaults.recordsDateFilter.to
      },
      totalsDateFilter: {
        from: parsed.totalsDateFilter?.from || defaults.totalsDateFilter.from,
        to: parsed.totalsDateFilter?.to || defaults.totalsDateFilter.to
      }
    }
  } catch {
    return defaults
  }
}

export function saveAppPreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) {
  if (typeof window === "undefined") return

  const preferences = loadAppPreferences()
  window.localStorage.setItem(
    preferencesKey,
    JSON.stringify({
      ...preferences,
      [key]: value
    })
  )
}

export function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2
  }).format(value || 0)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2
  }).format(value || 0)
}

export function formatRate(value: number) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0)
}

export function formatForeignCurrencyAmount(amount: number, currency: string) {
  return `${getCurrencySymbol(currency)}${(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

export { getCurrencySymbol }
