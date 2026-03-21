import { createServerClient } from '@/lib/supabase/server'
import { serverBroadcast } from '@/lib/supabase/serverBroadcast'
import { generateDice, rollDice } from './dice'
import { calculateScore, calculateAvailableScores, calculateTotals, isScorecardComplete } from './scoring'
import { chooseCategory, chooseDiceToHold, shouldReroll } from './bot'
import { createEmptyScorecard, GAME_END_ROUND, type Category } from './categories'
import { loadRoomState, saveRoomState, createInitialState } from './gameState'

interface BotTurnResult {
  playerIndex: number
  dice: number[]
  category: Category
  score: number
  rollCount: number
}

interface BotExecutionResult {
  botTurns: BotTurnResult[]
  nextPlayerIndex: number
  round: number
  gameFinished: boolean
  scores?: { playerIndex: number; grandTotal: number }[]
  winner?: number
}

/** Execute all consecutive bot turns starting from the given player index */
export async function executeBotTurns(
  roomId: string,
  roomCode: string,
  startPlayerIndex: number,
  startRound: number,
  playerCount: number
): Promise<BotExecutionResult> {
  const supabase = createServerClient()
  const botTurns: BotTurnResult[] = []

  let currentPlayerIndex = startPlayerIndex
  let currentRound = startRound

  // Get all players to check who is a bot
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('player_index')

  if (!players) {
    return { botTurns, nextPlayerIndex: currentPlayerIndex, round: currentRound, gameFinished: false }
  }

  const isBot = (idx: number) => players.find(p => p.player_index === idx)?.is_bot ?? false

  // Process consecutive bot turns
  while (isBot(currentPlayerIndex)) {
    let state = await loadRoomState(supabase, roomId)
    if (!state) {
      state = createInitialState(players.map(p => p.player_index))
    }

    const scorecard = state.scorecards[currentPlayerIndex] || createEmptyScorecard()

    // Bot rolls and decides
    let dice = generateDice()
    let rollCount = 1
    state.dice = dice
    state.rollCount = rollCount
    state.held = [false, false, false, false, false]
    await saveRoomState(supabase, roomId, state)

    // Broadcast first roll
    await serverBroadcast(roomCode, 'dice_roll', {
      dice,
      rollCount,
      playerIndex: currentPlayerIndex,
      availableCategories: calculateAvailableScores(dice, scorecard),
    })

    // Add delay for visual effect
    await sleep(800)

    // Re-rolls (up to 2 more times)
    while (rollCount < 3 && shouldReroll(dice, scorecard, rollCount)) {
      const held = chooseDiceToHold(dice, scorecard)
      dice = rollDice(dice, held)
      rollCount++
      state.dice = dice
      state.rollCount = rollCount
      state.held = held
      await saveRoomState(supabase, roomId, state)

      await serverBroadcast(roomCode, 'dice_roll', {
        dice,
        rollCount,
        playerIndex: currentPlayerIndex,
        availableCategories: calculateAvailableScores(dice, scorecard),
      })

      await sleep(600)
    }

    // Choose and score category
    const category = chooseCategory(dice, scorecard)
    const score = calculateScore(dice, category)
    scorecard[category] = score
    state.scorecards[currentPlayerIndex] = scorecard

    const turnResult: BotTurnResult = {
      playerIndex: currentPlayerIndex,
      dice,
      category,
      score,
      rollCount,
    }
    botTurns.push(turnResult)

    // Advance to next player using actual player indices (handles non-contiguous indices)
    const playerIndices = players.map(p => p.player_index).sort((a, b) => a - b)
    const currentPos = playerIndices.indexOf(currentPlayerIndex)
    const nextPos = (currentPos + 1) % playerIndices.length
    const nextPlayerIndex = playerIndices[nextPos]
    let nextRound = currentRound
    if (nextPos === 0) {
      nextRound = currentRound + 1
    }

    // Check if game is finished
    const allComplete = Object.values(state.scorecards).every(isScorecardComplete)
    const gameFinished = allComplete || nextRound >= GAME_END_ROUND

    if (gameFinished) {
      // Save final scores to DB
      for (const p of players) {
        const sc = state.scorecards[p.player_index]
        if (!sc) continue
        const totals = calculateTotals(sc)
        await supabase.from('game_scores').insert({
          room_id: roomId,
          player_id: p.id,
          upper_total: totals.upperTotal,
          upper_bonus: totals.upperBonus,
          lower_total: totals.lowerTotal,
          grand_total: totals.grandTotal,
          scorecard_data: sc,
          is_winner: false,
        })
      }

      const scores = players.map(p => ({
        playerId: p.id,
        playerIndex: p.player_index,
        total: calculateTotals(state!.scorecards[p.player_index] || createEmptyScorecard()).grandTotal,
      }))
      scores.sort((a, b) => b.total - a.total)

      if (scores.length > 0) {
        await supabase.from('game_scores').update({ is_winner: true }).eq('room_id', roomId).eq('player_id', scores[0].playerId)
      }

      await supabase.from('game_rooms').update({
        status: 'finished',
        finished_at: new Date().toISOString(),
        game_state: null,
      }).eq('id', roomId)

      // Broadcast score update and game end
      await serverBroadcast(roomCode, 'score_update', {
        playerIndex: currentPlayerIndex,
        category,
        score,
        nextPlayerIndex,
        round: nextRound,
        gameFinished: true,
      })

      await serverBroadcast(roomCode, 'game_end', {
        scores: scores.map(s => ({ playerIndex: s.playerIndex, grandTotal: s.total })),
        winner: scores[0]?.playerIndex,
      })

      return {
        botTurns,
        nextPlayerIndex,
        round: nextRound,
        gameFinished: true,
        scores: scores.map(s => ({ playerIndex: s.playerIndex, grandTotal: s.total })),
        winner: scores[0]?.playerIndex,
      }
    }

    // Broadcast score update
    await serverBroadcast(roomCode, 'score_update', {
      playerIndex: currentPlayerIndex,
      category,
      score,
      nextPlayerIndex,
      round: nextRound,
      gameFinished: false,
    })

    // Reset dice state for next turn and save atomically
    state.dice = [0, 0, 0, 0, 0]
    state.rollCount = 0
    state.held = [false, false, false, false, false]

    await supabase.from('game_rooms').update({
      current_turn_player_index: nextPlayerIndex,
      current_round: nextRound,
      game_state: state,
    }).eq('id', roomId)

    currentPlayerIndex = nextPlayerIndex
    currentRound = nextRound

    // Small delay before next bot turn
    await sleep(500)
  }

  return {
    botTurns,
    nextPlayerIndex: currentPlayerIndex,
    round: currentRound,
    gameFinished: false,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
