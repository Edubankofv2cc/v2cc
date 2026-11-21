import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Lang } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLKR(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === 'ta' ? 'ta-LK' : 'en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === 'ta' ? 'ta-LK' : 'en-LK').format(value)
}

export function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(lang === 'ta' ? 'ta-LK' : 'en-GB', { dateStyle: 'medium' }).format(new Date(value))
}

export function itemName(item: { name_en: string; name_ta: string } | null | undefined, lang: Lang) {
  if (!item) return '—'
  return lang === 'ta' ? item.name_ta : item.name_en
}

/** Neutralise spreadsheet formula injection (=, +, -, @, tab, CR) and quote every cell. */
export function csvCell(value: unknown): string {
  let s = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  // BOM so Excel opens UTF-8 Tamil text correctly
  const blob = new Blob(['﻿', text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
