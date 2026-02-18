'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGame } from '@/context/GameContext'
import { Link } from '@/i18n/routing'
import Image from 'next/image'

interface Confetti {
  id: number
  x: number
  delay: number
  duration: number
  color: string
  size: number
}

const CONFETTI_COLORS = ['#f68223', '#3baac9', '#93c160', '#7c5cbf', '#fbbf24', '#f472b6']

export function ResultsView() {
  const t = useTranslations('results')
  const { state } = useGame()
  const [confetti, setConfetti] = useState<Confetti[]>([])

  const sortedScores = [...(state.finalScores || [])].sort((a, b) => b.grandTotal - a.grandTotal)
  const winnerPlayer = state.players.find((p) => p.playerIndex === state.winner)

  useEffect(() => {
    const pieces: Confetti[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
    }))
    setConfetti(pieces)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 min-h-screen relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute top-0 animate-confetti pointer-events-none"
          style={{
            left: `${c.x}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
          }}
        >
          <div
            className="rounded-sm animate-confetti-spin"
            style={{
              width: c.size,
              height: c.size * 0.6,
              backgroundColor: c.color,
              animationDuration: `${0.5 + Math.random()}s`,
            }}
          />
        </div>
      ))}

      <h1 className="text-3xl font-bold text-dragon-text animate-bounce-in">{t('title')}</h1>

      {winnerPlayer && (
        <div className="text-center animate-scale-in">
          <Image
            src="/dragon-win.png"
            alt="Dragon celebrates"
            width={160}
            height={154}
            priority
            className="mx-auto drop-shadow-[0_4px_24px_rgba(246,130,35,0.5)] animate-float"
          />
          <p className="text-2xl font-bold text-dragon-orange mt-3 animate-glow">
            {t('winner', { name: winnerPlayer.displayName })}
          </p>
        </div>
      )}

      <div className="w-full max-w-sm animate-slide-up">
        <h2 className="text-lg font-semibold mb-3 text-dragon-text">{t('finalScores')}</h2>
        <div className="flex flex-col gap-2">
          {sortedScores.map((score, index) => {
            const player = state.players.find((p) => p.playerIndex === score.playerIndex)
            return (
              <div
                key={score.playerIndex}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  index === 0 ? 'bg-dragon-orange/15 border border-dragon-orange/30' : 'bg-dragon-card/60'
                }`}
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold w-6 ${index === 0 ? 'text-dragon-orange' : 'text-dragon-muted'}`}>
                    {index === 0 ? '\u{1F451}' : index + 1}
                  </span>
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
