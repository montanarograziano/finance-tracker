import { describe, it, expect } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translation as enTranslation } from './en'
import { translation as itTranslation } from './it'

const testI18n = i18n.createInstance()
void testI18n.use(initReactI18next).init({
  resources: { en: { translation: enTranslation }, it: { translation: itTranslation } },
  lng: 'it',
  fallbackLng: 'it',
  interpolation: { escapeValue: false },
  initAsync: false,
})

describe('i18n', () => {
  it('returns Italian nav strings in it locale', () => {
    void testI18n.changeLanguage('it')
    expect(testI18n.t('nav.transactions')).toBe('Transazioni')
    expect(testI18n.t('nav.accounts')).toBe('Conti')
  })

  it('returns English nav strings in en locale', () => {
    void testI18n.changeLanguage('en')
    expect(testI18n.t('nav.transactions')).toBe('Transactions')
    expect(testI18n.t('nav.accounts')).toBe('Accounts')
  })

  it('interpolates averages caption correctly in Italian', () => {
    void testI18n.changeLanguage('it')
    const result = testI18n.t('averages.caption', { count: 3, from: 'gen 2026', to: 'mar 2026' })
    expect(result).toBe('media su 3 mesi completi (gen 2026 – mar 2026)')
  })

  it('interpolates averages caption correctly in English', () => {
    void testI18n.changeLanguage('en')
    const result = testI18n.t('averages.caption', { count: 3, from: 'Jan 2026', to: 'Mar 2026' })
    expect(result).toBe('3-month average (Jan 2026 – Mar 2026)')
  })

  it('both locales have identical key count', () => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? flatten(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k)
          : [`${prefix ? `${prefix}.` : ''}${k}`],
      )
    const itKeys = flatten(itTranslation as unknown as Record<string, unknown>)
    const enKeys = flatten(enTranslation as unknown as Record<string, unknown>)
    expect(itKeys.sort()).toEqual(enKeys.sort())
  })
})
