import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import logger from '@/lib/utils/logger'
import { TOTAL_ROUNDS, createEmptyScorecard, ALL_CATEGORIES } from '@/lib/yahtzee/categories'
import { calculateTotals, isScorecardComplete } from '@/lib/yahtzee/scoring'
import { executeBotTurns } from '@/lib/yahtzee/botExecutor'
import { serverBroadcast } from '@/lib/supabase/serverBroadcast'
import { loadRoomState, saveRoomState, createInitialState } from '@/lib/yahtzee/gameState'

/** Skip a disconnected player's turn by scoring 0 in their lowest-value unfilled category */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json().catch(() => ({}))
  const { sessionId } = body

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

  // Verify requester is a player in this game (but NOT the current turn player)
  if (!sessionId) {
    return errorResponse('NOT_IN_GAME', 'Session ID is required', 401)
  }

  const { data: requester } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .eq('session_id', sessionId)
    .single()

  if (!requester) {
    return errorResponse('NOT_IN_GAME', 'You are not in this game', 403)
  }

  const playerIndex = room.current_turn_player_index

  let state = await loadRoomState(supabase, room.id)
  if (!state) {
    const { data: allPlayers } = await supabase
      .from('players')
      .select('player_index')
      .eq('room_id', room.id)

    state = createInitialState((allPlayers || []).map(p => p.player_index))
  }

  const scorecard = state.scorecards[playerIndex] || createEmptyScorecard()

  // Find the first unfilled category and score 0
  const unfilledCategory = ALL_CATEGORIES.find(c => scorecard[c] === null)
  if (!unfilledCategory) {
    return errorResponse('NO_CATEGORIES', 'No categories to skip', 409)
  }

  scorecard[unfilledCategory] = 0
  state.scorecards[playerIndex] = scorecard

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  const playerCount = (players || []).length

  // Advance to next player using actual player indices (handles non-contiguous indices)
  const playerIndices = (players || []).map(p => p.player_index).sort((a, b) => a - b)
  const currentPos = playerIndices.indexOf(playerIndex)
  const nextPos = (currentPos + 1) % playerIndices.length
  const nextPlayerIndex = playerIndices[nextPos]
  let nextRound = room.current_round
  if (nextPos === 0) {
    nextRound = room.current_round + 1
  }

  const allComplete = Object.values(state.scorecards).every(isScorecardComplete)
  const gameFinished = allComplete || nextRound > TOTAL_ROUNDS

  if (gameFinished) {
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
        is_winner: false,
      })
    }

    const scores = (players || []).map(p => ({
      playerId: p.id,
      playerIndex: p.player_index,
      total: calculateTotals(state!.scorecards[p.player_index] || createEmptyScorecard()).grandTotal,
    }))
    scores.sort((a, b) => b.total - a.total)

    if (scores.length > 0) {
      await supabase.from('game_scores').update({ is_winner: true }).eq('room_id', room.id).eq('player_id', scores[0].playerId)
    }

    await supabase.from('game_rooms').update({
      status: 'finished',
      finished_at: new Date().toISOString(),
      game_state: null,
    }).eq('id', room.id)

    // Broadcast score update and game end
    await serverBroadcast(code.toUpperCase(), 'score_update', {
      playerIndex,
      category: unfilledCategory,
      score: 0,
      nextPlayerIndex,
      round: nextRound,
      gameFinished: true,
    })

    await serverBroadcast(code.toUpperCase(), 'game_end', {
      scores: scores.map(s => ({ playerIndex: s.playerIndex, grandTotal: s.total })),
      winner: scores[0]?.playerIndex,
    })

    return NextResponse.json({
      skipped: true,
      category: unfilledCategory,
      gameFinished: true,
      scores: scores.map(s => ({ playerIndex: s.playerIndex, grandTotal: s.total })),
      winner: scores[0]?.playerIndex,
    })
  }

  // Reset dice state for next turn and save atomically with turn update
  state.dice = [0, 0, 0, 0, 0]
  state.rollCount = 0
  state.held = [false, false, false, false, false]

  await supabase.from('game_rooms').update({
    current_turn_player_index: nextPlayerIndex,
    current_round: nextRound,
    game_state: state,
  }).eq('id', room.id)

  // Broadcast score update (skip)
  await serverBroadcast(code.toUpperCase(), 'score_update', {
    playerIndex,
    category: unfilledCategory,
    score: 0,
    nextPlayerIndex,
    round: nextRound,
    gameFinished: false,
  })

  // Trigger bot turns if next player is a bot
  const nextPlayer = (players || []).find(p => p.player_index === nextPlayerIndex)
  if (nextPlayer?.is_bot) {
    executeBotTurns(room.id, code.toUpperCase(), nextPlayerIndex, nextRound, playerCount)
      .catch(err => logger.error('Bot execution error', { roomCode: code, error: String(err) }))
  }

  return NextResponse.json({
    skipped: true,
    category: unfilledCategory,
    nextPlayerIndex,
    round: nextRound,
    gameFinished: false,
  })
}
