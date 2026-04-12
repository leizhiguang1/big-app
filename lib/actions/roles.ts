'use server'

import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'
import * as rolesService from '@/lib/services/roles'

export async function createRoleAction(input: unknown) {
  const ctx = await getServerContext()
  const role = await rolesService.createRole(ctx, input)
  revalidatePath('/employees/roles')
  return role
}

export async function updateRoleAction(id: string, input: unknown) {
  const ctx = await getServerContext()
  const role = await rolesService.updateRole(ctx, id, input)
  revalidatePath('/employees/roles')
  return role
}

export async function deactivateRoleAction(id: string) {
  const ctx = await getServerContext()
  const role = await rolesService.deactivateRole(ctx, id)
  revalidatePath('/employees/roles')
  return role
}
