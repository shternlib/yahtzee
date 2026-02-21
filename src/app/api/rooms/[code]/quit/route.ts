import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/errors'
import { trackServerEvent } from '@/lib/analytics/posthog-server'
import { createEmptyScorecard } from '@/lib/yahtzee/categories'
import { calculateTotals } from '@/lib/yahtzee/scoring'
import { loadRoomState } from '../roll/route'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json().catch(() => ({}))
  const { sessionId } = body

  if (!sessionId) {
    return errorResponse('MISSING_SESSION', 'Session ID is required', 400)
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

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .eq('session_id', sessionId)
    .single()

  if (!player) {
    return errorResponse('NOT_IN_GAME', 'You are not in this game', 403)
  }

  const { data: allPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_index')

  const players = allPlayers || []
  const humanPlayers = players.filter(p => !p.is_bot)
  const isSoloVsBots = humanPlayers.length === 1 && humanPlayers[0].session_id === sessionId

  if (isSoloVsBots) {
    // End the game with current scores
    const state = await loadRoomState(room.id)

    const scores = players.map(p => ({
      playerId: p.id,
      playerIndex: p.player_index,
      total: state
        ? calculateTotals(state.scorecards[p.player_index] || createEmptyScorecard()).grandTotal
        : 0,
    }))
    scores.sort((a, b) => b.total - a.total)

    for (const p of players) {
      const sc = state?.scorecards[p.player_index]
      const totals = sc ? calculateTotals(sc) : { upperTotal: 0, upperBonus: 0, lowerTotal: 0, grandTotal: 0 }
      await supabase.from('game_scores').insert({
        room_id: room.id,
        player_id: p.id,
        upper_total: totals.upperTotal,
        upper_bonus: totals.upperBonus,
        lower_total: totals.lowerTotal,
        grand_total: totals.grandTotal,
        scorecard_data: sc || createEmptyScorecard(),
        is_winner: false,
      })
    }

    if (scores.length > 0) {
      await supabase.from('game_scores')
        .update({ is_winner: true })
        .eq('room_id', room.id)
        .eq('player_id', scores[0].playerId)
    }

    await supabase.from('game_rooms').update({
      status: 'finished',
      finished_at: new Date().toISOString(),
      game_state: null,
    }).eq('id', room.id)

    const durationSec = room.started_at
      ? Math.round((Date.now() - new Date(room.started_at).getTime()) / 1000)
      : 0

    trackServerEvent(sessionId, 'game_abandoned', {
      room_code: code.toUpperCase(),
      round: room.current_round,
      reason: 'quit',
    })

    trackServerEvent('game-system', 'game_finished', {
      room_code: code.toUpperCase(),
      duration_sec: durationSec,
      player_count: players.length,
      bot_count: players.filter(p => p.is_bot).length,
      winner_is_bot: players.find(p => p.player_index === scores[0]?.playerIndex)?.is_bot ?? false,
      winner_score: scores[0]?.total ?? 0,
      early_end: true,
    })

    return NextResponse.json({
      action: 'finished',
      scores: scores.map(s => ({ playerIndex: s.playerIndex, grandTotal: s.total })),
      winner: scores[0]?.playerIndex,
    })
  }

  // Multiplayer: mark player as disconnected and leave
  await supabase.from('players')
    .update({ is_connected: false })
    .eq('id', player.id)

  trackServerEvent(sessionId, 'game_abandoned', {
    room_code: code.toUpperCase(),
    round: room.current_round,
    reason: 'leave',
  })

  return NextResponse.json({ action: 'left' })
}
