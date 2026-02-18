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
      className="px-3 py-1.5 bg-dragon-card border border-dragon-purple/30 rounded-xl text-sm font-medium text-dragon-muted hover:text-dragon-text active:bg-dragon-card-light transition-colors"
      aria-label="Switch language"
    >
      {locale === 'en' ? 'RU' : 'EN'}
    </button>
  )
}
