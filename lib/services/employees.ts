import type { Context } from '@/lib/context/types'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { employeeInputSchema } from '@/lib/schemas/employees'
import type { Tables } from '@/lib/supabase/types'

export type Employee = Tables<'employees'>

export type EmployeeWithRelations = Employee & {
  role: { id: string; name: string } | null
  position: { id: string; name: string } | null
}

const SELECT_WITH_RELATIONS = '*, role:roles(id, name), position:positions(id, name)'

export async function listEmployees(ctx: Context): Promise<EmployeeWithRelations[]> {
  const { data, error } = await ctx.db
    .from('employees')
    .select(SELECT_WITH_RELATIONS)
    .order('code', { ascending: true })
  if (error) throw new ValidationError(error.message)
  return (data ?? []) as unknown as EmployeeWithRelations[]
}

export async function getEmployee(ctx: Context, id: string): Promise<EmployeeWithRelations> {
  const { data, error } = await ctx.db
    .from('employees')
    .select(SELECT_WITH_RELATIONS)
    .eq('id', id)
    .single()
  if (error || !data) throw new NotFoundError(`Employee ${id} not found`)
  return data as unknown as EmployeeWithRelations
}

function normalize(input: unknown) {
  const parsed = employeeInputSchema.parse(input)
  return {
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    email: parsed.email || null,
    phone: parsed.phone || null,
    role_id: parsed.role_id || null,
    position_id: parsed.position_id || null,
    is_active: parsed.is_active,
  }
}

export async function createEmployee(ctx: Context, input: unknown): Promise<Employee> {
  const row = normalize(input)
  const { data, error } = await ctx.db.from('employees').insert(row).select('*').single()
  if (error) {
    if (error.code === '23505') throw new ConflictError('An employee with that email already exists')
    throw new ValidationError(error.message)
  }
  return data
}

export async function updateEmployee(
  ctx: Context,
  id: string,
  input: unknown,
): Promise<Employee> {
  const row = normalize(input)
  const { data, error } = await ctx.db
    .from('employees')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') throw new ConflictError('An employee with that email already exists')
    throw new ValidationError(error.message)
  }
  if (!data) throw new NotFoundError(`Employee ${id} not found`)
  return data
}

export async function deactivateEmployee(ctx: Context, id: string): Promise<Employee> {
  const { data, error } = await ctx.db
    .from('employees')
    .update({ is_active: false })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new ValidationError(error.message)
  if (!data) throw new NotFoundError(`Employee ${id} not found`)
  return data
}
