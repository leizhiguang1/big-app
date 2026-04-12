import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import type { Context } from './types'

export async function getServerContext(): Promise<Context> {
  const db = await createClient()
  return {
    db,
    currentUser: null,
    outletIds: [],
    requestId: randomUUID(),
  }
}
