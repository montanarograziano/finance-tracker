import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translation as en } from './en'
import { translation as it } from './it'

const savedLang = localStorage.getItem('language') ?? 'it'

void i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'it',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng)
})

export default i18n
