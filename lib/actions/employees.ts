'use server'

import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'
import * as employeesService from '@/lib/services/employees'

export async function createEmployeeAction(input: unknown) {
  const ctx = await getServerContext()
  const employee = await employeesService.createEmployee(ctx, input)
  revalidatePath('/employees')
  return employee
}

export async function updateEmployeeAction(id: string, input: unknown) {
  const ctx = await getServerContext()
  const employee = await employeesService.updateEmployee(ctx, id, input)
  revalidatePath('/employees')
  return employee
}

export async function deactivateEmployeeAction(id: string) {
  const ctx = await getServerContext()
  const employee = await employeesService.deactivateEmployee(ctx, id)
  revalidatePath('/employees')
  return employee
}
