import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function ParentsPage() {
  const t = useTranslations('parents')

  return (
    <div className="px-6 py-12 max-w-prose mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('whatIs.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('whatIs.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('dataCollected.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('dataCollected.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('noChat.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('noChat.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('noPurchases.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('noPurchases.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('noAds.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('noAds.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('contact.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('contact.body')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('dataDeletion.title')}</h2>
        <p className="text-gray-300 leading-relaxed">{t('dataDeletion.body')}</p>
      </section>

      <div className="mt-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
          {t('backToHome')}
        </Link>
      </div>
    </div>
  )
}
