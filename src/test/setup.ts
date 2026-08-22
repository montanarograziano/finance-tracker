import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { afterEach, beforeAll } from 'vitest'
import { translation as it } from '../i18n/it'

void i18n.use(initReactI18next).init({
  resources: { it: { translation: it } },
  lng: 'it',
  fallbackLng: 'it',
  interpolation: { escapeValue: false },
  initAsync: false,
})

// Node 22+ exposes an experimental native localStorage that is undefined without
// --localstorage-file, shadowing jsdom's implementation. Provide an in-memory
// shim so tests that rely on localStorage work correctly.
beforeAll(() => {
  if (typeof localStorage === 'undefined' || localStorage === null) {
    const store: Record<string, string> = {}
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = String(v)
        },
        removeItem: (k: string) => {
          delete store[k]
        },
        clear: () => {
          Object.keys(store).forEach((k) => delete store[k])
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
        get length() {
          return Object.keys(store).length
        },
      },
    })
  }
})

afterEach(cleanup)
