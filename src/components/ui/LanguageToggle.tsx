'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const toggleLocale = () => {
    const next = locale === 'en' ? 'ru' : 'en'
    router.replace(pathname, { locale: next })
  }

  return (
    <button
      onClick={toggleLocale}
      className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors"
      aria-label="Switch language"
    >
      {locale === 'en' ? 'RU' : 'EN'}
    </button>
  )
}
