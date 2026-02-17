import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { isCategory, type Category, TOTAL_ROUNDS, createEmptyScorecard } from '@/lib/yahtzee/categories'
import { calculateScore, calculateAvailableScores, calculateTotals, isScorecardComplete } from '@/lib/yahtzee/scoring'
import { chooseCategory, chooseDiceToHold, shouldReroll } from '@/lib/yahtzee/bot'
import { generateDice, rollDice } from '@/lib/yahtzee/dice'
import { loadRoomState, saveRoomState, type RoomDiceState } from '../roll/route'

interface BotTurnResult {
  playerIndex: number
  dice: number[]
  category: Category
  score: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json()
  const { category, sessionId } = body

  if (!category || !isCategory(category)) {
    return errorResponse('INVALID_CATEGORY', 'Invalid scoring category', 400)
  }

  const supabase = createServerClient()

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) {
    return errorResponse('ROOM_NOT_FOUND', 'Room not found', 404)
  }

  if (room.status !== 'playing') {
    return errorResponse('GAME_NOT_IN_PROGRESS', 'Game is not in progress', 409)
  }

  // Verify turn
  if (sessionId) {
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .eq('session_id', sessionId)
      .single()

    if (!player || player.player_index !== room.current_turn_player_index) {
      return errorResponse('NOT_YOUR_TURN', 'It is not your turn', 403)
    }
  }

  const state = await loadRoomState(room.id)
  if (!state || state.rollCount === 0) {
    return errorResponse('MUST_ROLL_FIRST', 'Must roll at least once before scoring', 409)
  }

  const playerIndex = room.current_turn_player_index
  const scorecard = state.scorecards[playerIndex] || createEmptyScorecard()

  if (scorecard[category as Category] !== null) {
    return errorResponse('CATEGORY_FILLED', 'Category already filled', 409)
  }

  // Calculate and record score
  const score = calculateScore(state.dice, category as Category)
  scorecard[category as Category] = score
  state.scorecards[playerIndex] = scorecard

  // Get all players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  const playerCount = (players || []).length

  // Advance to next player
  let nextPlayerIndex = (playerIndex + 1) % playerCount
  let nextRound = room.current_round

  if (nextPlayerIndex <= playerIndex) {
    nextRound = room.current_round + 1
  }

  // Check if game is finished
  const allComplete = Object.values(state.scorecards).every(isScorecardComplete)
  let gameFinished = allComplete || nextRound > TOTAL_ROUNDS

  if (gameFinished) {
    return await finishGame(supabase, room.id, state, players || [], score)
  }

  // Execute bot turns synchronously
  const botTurns: BotTurnResult[] = []
  const isBot = (idx: number) => (players || []).find(p => p.player_index === idx)?.is_bot ?? false

  while (isBot(nextPlayerIndex) && !gameFinished) {
    const botResult = executeSingleBotTurn(state, nextPlayerIndex)
    botTurns.push(botResult)

    // Advance past bot
    const afterBotIndex = (nextPlayerIndex + 1) % playerCount
    let afterBotRound = nextRound
    if (afterBotIndex <= nextPlayerIndex) {
      afterBotRound = nextRound + 1
    }

    const allDone = Object.values(state.scorecards).every(isScorecardComplete)
    gameFinished = allDone || afterBotRound > TOTAL_ROUNDS

    if (gameFinished) {
      return await finishGame(supabase, room.id, state, players || [], score, botTurns)
    }

    nextPlayerIndex = afterBotIndex
    nextRound = afterBotRound
  }

  // Update room for next human turn
  state.dice = [0, 0, 0, 0, 0]
  state.rollCount = 0
  state.held = [false, false, false, false, false]
  await saveRoomState(room.id, state)

  await supabase
    .from('game_rooms')
    .update({
      current_turn_player_index: nextPlayerIndex,
      current_round: nextRound,
    })
    .eq('id', room.id)

  return NextResponse.json({
    score,
    nextPlayerIndex,
    round: nextRound,
    gameFinished: false,
    botTurns,
  })
}

/** Execute a single bot turn: roll, decide, score */
function executeSingleBotTurn(state: RoomDiceState, playerIndex: number): BotTurnResult {
  const scorecard = state.scorecards[playerIndex] || createEmptyScorecard()

  // First roll
  let dice = generateDice()
  let rollCount = 1

  // Re-rolls
  while (rollCount < 3 && shouldReroll(dice, scorecard, rollCount)) {
    const held = chooseDiceToHold(dice, scorecard)
    dice = rollDice(dice, held)
    rollCount++
  }

  // Choose and score category
  const cat = chooseCategory(dice, scorecard)
  const sc = calculateScore(dice, cat)
  scorecard[cat] = sc
  state.scorecards[playerIndex] = scorecard

  return { playerIndex, dice, category: cat, score: sc }
}

/** Finish the game: save scores, determine winner, clean up */
async function finishGame(
  supabase: ReturnType<typeof createServerClient>,
  roomId: string,
  state: RoomDiceState,
  players: { id: string; player_index: number }[],
  humanScore: number,
  botTurns?: BotTurnResult[]
) {
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
    total: calculateTotals(state.scorecards[p.player_index] || createEmptyScorecard()).grandTotal,
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

  return NextResponse.json({
    score: humanScore,
    gameFinished: true,
    scores: scores.map(s => ({ playerIndex: s.playerIndex, grandTotal: s.total })),
    winner: scores[0]?.playerIndex,
    botTurns,
  })
}
