import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function TermsPage() {
  const t = useTranslations('terms')

  return (
    <div className="px-6 py-12 max-w-prose mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>
      <p className="text-sm text-gray-400 mb-8">{t('lastUpdated')}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('acceptance.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('acceptance.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('gameRules.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('gameRules.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('conduct.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('conduct.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('intellectualProperty.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('intellectualProperty.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('disclaimer.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('disclaimer.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('liability.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('liability.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('changes.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('changes.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('contact.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('contact.body')}</p>
      </section>

      <div className="mt-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
          {t('backToHome')}
        </Link>
      </div>
    </div>
  )
}
