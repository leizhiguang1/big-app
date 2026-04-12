import type { Context } from '@/lib/context/types'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import {
  serviceCategoryInputSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
} from '@/lib/schemas/services'
import type { Tables } from '@/lib/supabase/types'

export type Service = Tables<'services'>
export type ServiceCategory = Tables<'service_categories'>

export type ServiceWithCategory = Service & {
  category: { id: string; name: string } | null
}

export async function listServices(ctx: Context): Promise<ServiceWithCategory[]> {
  const { data, error } = await ctx.db
    .from('services')
    .select('*, category:service_categories(id, name)')
    .order('name', { ascending: true })
  if (error) throw new ValidationError(error.message)
  return (data ?? []) as ServiceWithCategory[]
}

export async function getService(ctx: Context, id: string): Promise<Service> {
  const { data, error } = await ctx.db
    .from('services')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) throw new NotFoundError(`Service ${id} not found`)
  return data
}

export async function createService(ctx: Context, input: unknown): Promise<Service> {
  const parsed = serviceCreateSchema.parse(input)
  const { data, error } = await ctx.db
    .from('services')
    .insert({
      sku: parsed.sku,
      name: parsed.name,
      category_id: parsed.category_id,
      type: parsed.type,
      duration_min: parsed.duration_min,
      price: parsed.price,
      incentive_type: parsed.incentive_type,
      consumables: parsed.consumables,
      discount_cap: parsed.discount_cap,
      full_payment: parsed.full_payment,
      is_active: parsed.is_active,
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505')
      throw new ConflictError('A service with that SKU already exists')
    throw new ValidationError(error.message)
  }
  return data
}

export async function updateService(
  ctx: Context,
  id: string,
  input: unknown,
): Promise<Service> {
  const parsed = serviceUpdateSchema.parse(input)
  const { data, error } = await ctx.db
    .from('services')
    .update({
      name: parsed.name,
      category_id: parsed.category_id,
      type: parsed.type,
      duration_min: parsed.duration_min,
      price: parsed.price,
      incentive_type: parsed.incentive_type,
      consumables: parsed.consumables,
      discount_cap: parsed.discount_cap,
      full_payment: parsed.full_payment,
      is_active: parsed.is_active,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new ValidationError(error.message)
  if (!data) throw new NotFoundError(`Service ${id} not found`)
  return data
}

export async function deactivateService(ctx: Context, id: string): Promise<Service> {
  const { data, error } = await ctx.db
    .from('services')
    .update({ is_active: false })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new ValidationError(error.message)
  if (!data) throw new NotFoundError(`Service ${id} not found`)
  return data
}

export async function listCategories(ctx: Context): Promise<ServiceCategory[]> {
  const { data, error } = await ctx.db
    .from('service_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new ValidationError(error.message)
  return data ?? []
}

export async function createCategory(
  ctx: Context,
  input: unknown,
): Promise<ServiceCategory> {
  const parsed = serviceCategoryInputSchema.parse(input)
  const { data, error } = await ctx.db
    .from('service_categories')
    .insert({
      name: parsed.name,
      sort_order: parsed.sort_order,
      is_active: parsed.is_active,
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505')
      throw new ConflictError('A category with that name already exists')
    throw new ValidationError(error.message)
  }
  return data
}
