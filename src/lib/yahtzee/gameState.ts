import { SupabaseClient } from '@supabase/supabase-js'
import { createEmptyScorecard, type ScorecardData } from './categories'

export interface RoomGameState {
  dice: number[]
  rollCount: number
  held: boolean[]
  scorecards: Record<number, ScorecardData>
}

/** Load game state from database */
export async function loadRoomState(
  supabase: SupabaseClient,
  roomId: string
): Promise<RoomGameState | null> {
  const { data } = await supabase
    .from('game_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single()

  if (!data?.game_state) return null
  return data.game_state as RoomGameState
}

/** Save game state to database */
export async function saveRoomState(
  supabase: SupabaseClient,
  roomId: string,
  state: RoomGameState
): Promise<void> {
  await supabase
    .from('game_rooms')
    .update({ game_state: state })
    .eq('id', roomId)
}

/** Clear game state (on game end) */
export async function clearRoomState(
  supabase: SupabaseClient,
  roomId: string
): Promise<void> {
  await supabase
    .from('game_rooms')
    .update({ game_state: null })
    .eq('id', roomId)
}

/** Initialize game state for a room with given player indices */
export function createInitialState(playerIndices: number[]): RoomGameState {
  const scorecards: Record<number, ScorecardData> = {}
  for (const idx of playerIndices) {
    scorecards[idx] = createEmptyScorecard()
  }
  return {
    dice: [0, 0, 0, 0, 0],
    rollCount: 0,
    held: [false, false, false, false, false],
    scorecards,
  }
}
