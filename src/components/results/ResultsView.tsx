'use client'

import { useTranslations } from 'next-intl'
import { useGame } from '@/context/GameContext'
import { Link } from '@/i18n/routing'
import Image from 'next/image'

export function ResultsView() {
  const t = useTranslations('results')
  const { state } = useGame()

  const sortedScores = [...(state.finalScores || [])].sort((a, b) => b.grandTotal - a.grandTotal)
  const winnerPlayer = state.players.find((p) => p.playerIndex === state.winner)

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 min-h-screen">
      <h1 className="text-3xl font-bold text-dragon-text">{t('title')}</h1>

      {winnerPlayer && (
        <div className="text-center">
          <Image
            src="/dragon-bg.png"
            alt="Dragon celebrates"
            width={100}
            height={100}
            className="mx-auto drop-shadow-[0_4px_16px_rgba(246,130,35,0.4)]"
          />
          <p className="text-xl font-bold text-dragon-orange mt-2">
            {t('winner', { name: winnerPlayer.displayName })}
          </p>
        </div>
      )}

      <div className="w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-3 text-dragon-text">{t('finalScores')}</h2>
        <div className="flex flex-col gap-2">
          {sortedScores.map((score, index) => {
            const player = state.players.find((p) => p.playerIndex === score.playerIndex)
            return (
              <div
                key={score.playerIndex}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  index === 0 ? 'bg-dragon-orange/15 border border-dragon-orange/30' : 'bg-dragon-card/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-dragon-muted w-6">{index + 1}</span>
                  <span className="font-medium text-dragon-text">{player?.displayName}</span>
                </div>
                <span className="font-mono font-bold text-lg text-dragon-text">{score.grandTotal}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm mt-auto">
        <Link
          href="/"
          className="w-full py-4 bg-dragon-orange text-white rounded-xl text-lg font-bold text-center active:bg-dragon-orange-dark transition-colors shadow-lg shadow-dragon-orange/30"
        >
          {t('playAgain')}
        </Link>
        <Link
          href="/"
          className="w-full py-3 bg-dragon-card text-dragon-muted rounded-xl text-center font-semibold active:bg-dragon-card-light transition-colors"
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  )
}
