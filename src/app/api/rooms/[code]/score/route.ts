import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { isCategory, type Category, TOTAL_ROUNDS, createEmptyScorecard } from '@/lib/yahtzee/categories'
import { calculateScore, calculateTotals, isScorecardComplete } from '@/lib/yahtzee/scoring'
import { executeBotTurns } from '@/lib/yahtzee/botExecutor'
import { getRoomState, setRoomState } from '../roll/route'

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

  const state = getRoomState(room.id)
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

  // If we've gone through all players, advance round
  if (nextPlayerIndex <= playerIndex) {
    nextRound = room.current_round + 1
  }

  // Check if game is finished (all scorecards complete)
  const allComplete = Object.values(state.scorecards).every(isScorecardComplete)
  const gameFinished = allComplete || nextRound > TOTAL_ROUNDS

  if (gameFinished) {
    // Save final scores
    for (const p of players || []) {
      const sc = state.scorecards[p.player_index]
      if (!sc) continue
      const totals = calculateTotals(sc)

      await supabase.from('game_scores').insert({
        room_id: room.id,
        player_id: p.id,
        upper_total: totals.upperTotal,
        upper_bonus: totals.upperBonus,
        lower_total: totals.lowerTotal,
        grand_total: totals.grandTotal,
        scorecard_data: sc,
        is_winner: false, // updated below
      })
    }

    // Determine winner
    const scores = (players || []).map((p) => ({
      playerId: p.id,
      playerIndex: p.player_index,
      total: calculateTotals(state.scorecards[p.player_index] || createEmptyScorecard()).grandTotal,
    }))
    scores.sort((a, b) => b.total - a.total)

    if (scores.length > 0) {
      await supabase
        .from('game_scores')
        .update({ is_winner: true })
        .eq('room_id', room.id)
        .eq('player_id', scores[0].playerId)
    }

    // Update room status
    await supabase
      .from('game_rooms')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    // Clean up in-memory state
    setRoomState(room.id, undefined as any)

    return NextResponse.json({
      score,
      gameFinished: true,
      scores: scores.map((s) => ({
        playerIndex: s.playerIndex,
        grandTotal: s.total,
      })),
      winner: scores[0]?.playerIndex,
    })
  }

  // Update room for next turn
  await supabase
    .from('game_rooms')
    .update({
      current_turn_player_index: nextPlayerIndex,
      current_round: nextRound,
    })
    .eq('id', room.id)

  // Reset dice state for next turn
  state.dice = [0, 0, 0, 0, 0]
  state.rollCount = 0
  state.held = [false, false, false, false, false]
  setRoomState(room.id, state)

  // Check if next player is a bot — execute bot turns asynchronously
  const nextPlayer = (players || []).find(p => p.player_index === nextPlayerIndex)
  if (nextPlayer?.is_bot) {
    // Fire and forget — bot turns run in background, broadcast results via realtime
    executeBotTurns(room.id, code.toUpperCase(), nextPlayerIndex, nextRound, playerCount)
      .catch(err => console.error('Bot execution error:', err))
  }

  return NextResponse.json({
    score,
    nextPlayerIndex,
    round: nextRound,
    gameFinished: false,
  })
}
