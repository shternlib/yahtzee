'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="py-6 px-4 text-center text-xs text-gray-500 flex flex-wrap justify-center gap-x-4 gap-y-1">
      <Link href="/privacy" className="hover:text-gray-400 transition-colors">
        {t('privacy')}
      </Link>
      <Link href="/terms" className="hover:text-gray-400 transition-colors">
        {t('terms')}
      </Link>
      <Link href="/parents" className="hover:text-gray-400 transition-colors">
        {t('parents')}
      </Link>
    </footer>
  )
}
