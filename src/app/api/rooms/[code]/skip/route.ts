import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { TOTAL_ROUNDS, createEmptyScorecard, ALL_CATEGORIES } from '@/lib/yahtzee/categories'
import { trackServerEvent } from '@/lib/analytics/posthog-server'
import { calculateTotals, isScorecardComplete } from '@/lib/yahtzee/scoring'
import { loadRoomState, saveRoomState } from '../roll/route'

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
  if (sessionId) {
    const { data: requester } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .eq('session_id', sessionId)
      .single()

    if (!requester) {
      return errorResponse('NOT_IN_GAME', 'You are not in this game', 403)
    }
  }

  const playerIndex = room.current_turn_player_index

  let state = await loadRoomState(room.id)
  if (!state) {
    const { data: allPlayers } = await supabase
      .from('players')
      .select('player_index')
      .eq('room_id', room.id)

    const scorecards: Record<number, import('@/lib/yahtzee/categories').ScorecardData> = {}
    for (const p of allPlayers || []) {
      scorecards[p.player_index] = createEmptyScorecard()
    }
    state = { dice: [0, 0, 0, 0, 0], rollCount: 0, held: [false, false, false, false, false], scorecards }
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

  let nextPlayerIndex = (playerIndex + 1) % playerCount
  let nextRound = room.current_round
  if (nextPlayerIndex <= playerIndex) {
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

    await supabase.from('game_rooms').update({ status: 'finished', finished_at: new Date().toISOString(), game_state: null }).eq('id', room.id)

    return NextResponse.json({
      skipped: true,
      category: unfilledCategory,
      gameFinished: true,
      scores: scores.map(s => ({ playerIndex: s.playerIndex, grandTotal: s.total })),
      winner: scores[0]?.playerIndex,
    })
  }

  await supabase.from('game_rooms').update({
    current_turn_player_index: nextPlayerIndex,
    current_round: nextRound,
  }).eq('id', room.id)

  state.dice = [0, 0, 0, 0, 0]
  state.rollCount = 0
  state.held = [false, false, false, false, false]
  await saveRoomState(room.id, state)

  trackServerEvent(sessionId || 'anonymous', 'turn_skipped', {
    room_code: code.toUpperCase(),
    round: room.current_round,
    category: unfilledCategory,
  })

  return NextResponse.json({
    skipped: true,
    category: unfilledCategory,
    nextPlayerIndex,
    round: nextRound,
    gameFinished: false,
  })
}
