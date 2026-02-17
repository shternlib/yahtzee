'use client'

import { useTranslations } from 'next-intl'
import { useGame } from '@/context/GameContext'
import { Link } from '@/i18n/routing'

export function ResultsView() {
  const t = useTranslations('results')
  const { state } = useGame()

  const sortedScores = [...(state.finalScores || [])].sort((a, b) => b.grandTotal - a.grandTotal)
  const winnerPlayer = state.players.find((p) => p.playerIndex === state.winner)

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 min-h-screen">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      {winnerPlayer && (
        <div className="text-center">
          <div className="text-6xl mb-2">&#x1F3C6;</div>
          <p className="text-xl font-bold text-yellow-400">
            {t('winner', { name: winnerPlayer.displayName })}
          </p>
        </div>
      )}

      <div className="w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-3">{t('finalScores')}</h2>
        <div className="flex flex-col gap-2">
          {sortedScores.map((score, index) => {
            const player = state.players.find((p) => p.playerIndex === score.playerIndex)
            return (
              <div
                key={score.playerIndex}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  index === 0 ? 'bg-yellow-900/30 border border-yellow-500/30' : 'bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
                  <span className="font-medium">{player?.displayName}</span>
                </div>
                <span className="font-mono font-bold text-lg">{score.grandTotal}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm mt-auto">
        <Link
          href="/"
          className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold text-center active:bg-blue-700 transition-colors"
        >
          {t('playAgain')}
        </Link>
        <Link
          href="/"
          className="w-full py-3 bg-gray-700 text-gray-200 rounded-xl text-center font-semibold active:bg-gray-600 transition-colors"
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  )
}
