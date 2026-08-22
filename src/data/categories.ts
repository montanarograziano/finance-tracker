import { supabase } from '../lib/supabase'
import type { Category, CategoryType } from '../lib/types'

export type CategoryInput = {
  name: string
  type: CategoryType
  color: string
  icon: string
  parent_id: string | null
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) throw new Error(error.message)
  return data as Category[]
}

export async function createCategory(input: CategoryInput): Promise<void> {
  const { error } = await supabase.from('categories').insert(input)
  if (error) throw new Error(error.message)
}

/** Insert several categories and return the created rows (used by import). */
export async function createCategoriesReturning(inputs: CategoryInput[]): Promise<Category[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase.from('categories').insert(inputs).select()
  if (error) throw new Error(error.message)
  return data as Category[]
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const { error } = await supabase.from('categories').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
