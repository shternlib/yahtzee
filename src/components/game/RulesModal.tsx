'use client'

import { useTranslations } from 'next-intl'

interface RulesModalProps {
  open: boolean
  onClose: () => void
}

export function RulesModal({ open, onClose }: RulesModalProps) {
  const t = useTranslations('rules')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-12 pb-8" onClick={onClose}>
      <div
        className="bg-dragon-card rounded-2xl border border-dragon-purple/30 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-dragon-card rounded-t-2xl flex items-center justify-between px-5 py-4 border-b border-dragon-purple/20">
          <h2 className="text-lg font-bold text-dragon-orange">{t('title')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-dragon-card-light text-dragon-muted active:bg-dragon-purple/30"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 text-sm text-dragon-text/90 leading-relaxed">
          <p className="text-dragon-muted italic">{t('intro')}</p>

          <section>
            <h3 className="font-bold text-dragon-cyan mb-1">{t('goalTitle')}</h3>
            <p>{t('goal')}</p>
          </section>

          <section>
            <h3 className="font-bold text-dragon-cyan mb-1">{t('turnTitle')}</h3>
            <p>{t('turn1')}</p>
            <p className="mt-1">{t('turn2')}</p>
            <p className="mt-1">{t('turn3')}</p>
          </section>

          <section>
            <h3 className="font-bold text-dragon-cyan mb-1">{t('upperTitle')}</h3>
            <p>{t('upper')}</p>
            <div className="mt-1 pl-3 border-l-2 border-dragon-purple/30 text-dragon-muted text-xs flex flex-col gap-0.5">
              <span>{t('ones')} — {t('upperEx')}</span>
              <span>{t('bonus')}</span>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-dragon-cyan mb-1">{t('lowerTitle')}</h3>
            <div className="flex flex-col gap-1.5 text-xs">
              <div><span className="text-dragon-orange font-semibold">{t('threeKind')}</span> — {t('threeKindDesc')}</div>
              <div><span className="text-dragon-orange font-semibold">{t('fourKind')}</span> — {t('fourKindDesc')}</div>
              <div><span className="text-dragon-orange font-semibold">{t('fullHouse')}</span> — {t('fullHouseDesc')}</div>
              <div><span className="text-dragon-orange font-semibold">{t('smallStr')}</span> — {t('smallStrDesc')}</div>
              <div><span className="text-dragon-orange font-semibold">{t('largeStr')}</span> — {t('largeStrDesc')}</div>
              <div><span className="text-dragon-orange font-semibold">{t('yahtzee')}</span> — {t('yahtzeeDesc')}</div>
              <div><span className="text-dragon-orange font-semibold">{t('chance')}</span> — {t('chanceDesc')}</div>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-dragon-cyan mb-1">{t('tipsTitle')}</h3>
            <p>{t('tips')}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
