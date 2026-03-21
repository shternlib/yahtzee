import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function PrivacyPage() {
  const t = useTranslations('privacy')

  return (
    <div className="px-6 py-12 max-w-prose mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>
      <p className="text-sm text-gray-400 mb-8">{t('lastUpdated')}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('dataCollected.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('dataCollected.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('dataUsage.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('dataUsage.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('dataRetention.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('dataRetention.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('thirdParty.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('thirdParty.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('children.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('children.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('parentalRights.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('parentalRights.body')}</p>
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
