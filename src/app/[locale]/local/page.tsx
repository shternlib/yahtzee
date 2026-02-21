'use client'

import { useReducer, useState, useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/routing'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { RulesModal } from '@/components/game/RulesModal'
import { LocalSetup } from '@/components/local/LocalSetup'
import { LocalGameBoard } from '@/components/local/LocalGameBoard'
import { LocalResults } from '@/components/local/LocalResults'
import { localGameReducer, initialLocalGameState } from '@/lib/local/localGameReducer'
import type { Category } from '@/lib/yahtzee/categories'
import { trackEvent } from '@/lib/analytics/posthog-client'

export default function LocalGamePage() {
  const [state, dispatch] = useReducer(localGameReducer, initialLocalGameState)
  const [showRules, setShowRules] = useState(false)
  const router = useRouter()
  const prevStatus = useRef(state.status)

  useEffect(() => {
    if (prevStatus.current !== state.status) {
      if (state.status === 'playing' && prevStatus.current === 'setup') {
        trackEvent('local_game_started', { player_count: state.players.length })
      }
      if (state.status === 'finished') {
        const winnerScore = state.winner !== null
          ? state.finalScores.find(s => s.playerIndex === state.winner)?.grandTotal ?? 0
          : 0
        trackEvent('local_game_finished', {
          player_count: state.players.length,
          winner_score: winnerScore,
        })
      }
      prevStatus.current = state.status
    }
  }, [state.status, state.players.length, state.finalScores, state.winner])

  if (state.status === 'setup') {
    return (
      <div className="relative">
        <div className="fixed safe-top right-3 z-10 flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-dragon-card border border-dragon-purple/30 text-dragon-muted active:bg-dragon-card-light transition-colors"
            aria-label="Rules"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <LanguageToggle />
        </div>
        <RulesModal open={showRules} onClose={() => setShowRules(false)} />
        <LocalSetup
          players={state.players}
          onAddPlayer={(name) => dispatch({ type: 'ADD_PLAYER', payload: { name } })}
          onRemovePlayer={(index) => dispatch({ type: 'REMOVE_PLAYER', payload: { index } })}
          onStartGame={() => dispatch({ type: 'START_GAME' })}
        />
      </div>
    )
  }

  if (state.status === 'finished') {
    return (
      <LocalResults
        players={state.players}
        finalScores={state.finalScores}
        winner={state.winner}
        onPlayAgain={() => dispatch({ type: 'RESET_GAME' })}
        onNewGame={() => router.push('/')}
      />
    )
  }

  return (
    <div className="relative pt-16">
      <div className="fixed safe-top right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowRules(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-dragon-card border border-dragon-purple/30 text-dragon-muted active:bg-dragon-card-light transition-colors"
          aria-label="Rules"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
        <LanguageToggle />
      </div>
      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
      <LocalGameBoard
        state={state}
        onTapDie={(index: number) => dispatch({ type: 'SET_DIE', payload: { dieIndex: index } })}
        onClearDice={() => dispatch({ type: 'CLEAR_DICE' })}
        onSelectCategory={(category: Category) => dispatch({ type: 'SELECT_CATEGORY', payload: { category } })}
        onEndGame={() => {
          trackEvent('local_game_ended_early', { round: state.round, player_count: state.players.length })
          dispatch({ type: 'END_GAME' })
        }}
      />
    </div>
  )
}
