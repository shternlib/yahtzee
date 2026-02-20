'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { DiceInput } from './DiceInput'
import { Scorecard } from '@/components/scorecard/Scorecard'
import type { PlayerInfo } from '@/context/gameReducer'
import type { LocalGameState } from '@/lib/local/localGameReducer'
import type { Category } from '@/lib/yahtzee/categories'

interface LocalGameBoardProps {
  state: LocalGameState
  onTapDie: (index: number) => void
  onClearDice: () => void
  onSelectCategory: (category: Category) => void
  onEndGame: () => void
}

export function LocalGameBoard({ state, onTapDie, onClearDice, onSelectCategory, onEndGame }: LocalGameBoardProps) {
  const t = useTranslations('local')
  const [showConfirm, setShowConfirm] = useState(false)

  const currentPlayer = state.players[state.currentPlayerIndex]
  const allDiceSet = state.dice.every(d => d > 0)

  const playerInfos: PlayerInfo[] = state.players.map((name, i) => ({
    id: `local-${i}`,
    displayName: name,
    playerIndex: i,
    isBot: false,
    isConnected: true,
  }))

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Turn indicator */}
      <div className="text-center py-3 px-4 rounded-2xl bg-dragon-orange/15 border border-dragon-orange/30">
        <p className="text-xs text-dragon-muted mb-1">
          {t('roundInfo', { round: state.round })}
        </p>
        <p className="text-lg font-bold text-dragon-orange">
          {t('turnOf', { name: currentPlayer })}
        </p>
      </div>

      {/* Dice input */}
      <DiceInput
        dice={state.dice}
        onTapDie={onTapDie}
        disabled={false}
      />

      {/* Dice controls */}
      <div className="flex items-center justify-center gap-3">
        {!allDiceSet && (
          <p className="text-sm text-dragon-muted">{t('setAllDice')}</p>
        )}
        {state.dice.some(d => d > 0) && (
          <button
            onClick={onClearDice}
            className="px-4 py-1.5 text-sm text-dragon-muted bg-dragon-card border border-dragon-purple/30 rounded-xl active:bg-dragon-card-light transition-colors"
          >
            {t('clearDice')}
          </button>
        )}
      </div>

      {/* Scorecard */}
      <Scorecard
        players={playerInfos}
        scorecards={state.scorecards}
        lastMoves={state.lastMoves}
        currentTurnIndex={state.currentPlayerIndex}
        myPlayerIndex={state.currentPlayerIndex}
        availableCategories={state.availableCategories}
        onSelectCategory={onSelectCategory}
        isInteractive={allDiceSet}
      />

      {/* End game button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full py-3 text-dragon-muted rounded-xl font-medium active:text-dragon-text transition-colors"
      >
        {t('endGame')}
      </button>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="bg-dragon-card rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4 border border-dragon-purple/30">
            <p className="text-center text-base font-medium text-dragon-text">
              {t('confirmEnd')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-dragon-card-light rounded-xl font-semibold text-dragon-muted active:bg-dragon-purple/30 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => { setShowConfirm(false); onEndGame() }}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold active:bg-red-700 transition-colors"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
