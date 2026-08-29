import { seedData } from '../data/seed'
import type {
  Category,
  CategoryGroup,
  NavigationData,
  NavigationDeleteSet,
  NavLink,
  SiteSettings,
} from '../types'
import { normalizeLegacyCategory } from './categoryGroups'
import { isSupabaseConfigured, supabase } from './supabase'

const STORAGE_KEY = 'hjcm-navigation-data-v2'
const LEGACY_STORAGE_KEY = 'hjcm-navigation-data-v1'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const cloneSeed = (): NavigationData => clone(seedData)

const normalizeData = (value: Partial<NavigationData> & { categories?: Array<Category & { emoji?: string }> }): NavigationData => {
  const groups = value.groups?.length ? value.groups : seedData.groups
  return {
    groups: groups.map((group) => ({ ...group, is_pinned: group.is_pinned ?? false })),
    categories: (value.categories ?? []).map((category) => normalizeLegacyCategory(category, groups)),
    links: (value.links ?? []).map((link) => ({
      ...link,
      is_pinned: link.is_pinned ?? false,
      health_status: link.health_status ?? 'unchecked',
      http_status: link.http_status ?? null,
      last_checked_at: link.last_checked_at ?? null,
      final_url: link.final_url ?? '',
      health_error: link.health_error ?? '',
    })),
    settings: value.settings ?? seedData.settings,
  }
}

const readLocal = (): NavigationData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (stored) {
      const normalized = normalizeData(JSON.parse(stored) as NavigationData)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      return normalized
    }
  } catch {
    // Fall back to a clean seed instead of blocking the public page.
  }
  const initial = cloneSeed()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  return initial
}

const writeLocal = (data: NavigationData) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

export const repository = {
  mode: isSupabaseConfigured ? ('cloud' as const) : ('local' as const),

  async load(): Promise<NavigationData> {
    if (!supabase) return readLocal()

    const [groupsResult, categoriesResult, linksResult, settingsResult] = await Promise.all([
      supabase.from('category_groups').select('*').order('is_pinned', { ascending: false }).order('order_index'),
      supabase.from('categories').select('*').order('is_pinned', { ascending: false }).order('order_index'),
      supabase.from('links').select('*').order('is_pinned', { ascending: false }).order('order_index'),
      supabase.from('site_settings').select('*').eq('id', 'main').maybeSingle(),
    ])

    const error = groupsResult.error || categoriesResult.error || linksResult.error || settingsResult.error
    if (error) throw error

    return normalizeData({
      groups: (groupsResult.data ?? []) as CategoryGroup[],
      categories: (categoriesResult.data ?? []) as Category[],
      links: (linksResult.data ?? []) as NavLink[],
      settings: (settingsResult.data ?? seedData.settings) as SiteSettings,
    })
  },

  async saveBatch(data: NavigationData, deleted: NavigationDeleteSet) {
    if (!supabase) {
      writeLocal(data)
      return
    }

    const { error } = await supabase.rpc('save_navigation_batch', {
      payload: {
        groups: data.groups,
        categories: data.categories,
        links: data.links,
        settings: data.settings,
        deleted,
      },
    })
    if (error) throw error
  },

  async importData(data: NavigationData) {
    const normalized = normalizeData(data)
    if (!supabase) {
      writeLocal(normalized)
      return
    }
    await this.saveBatch(normalized, { groupIds: [], categoryIds: [], linkIds: [] })
  },

  resetLocal(): NavigationData {
    const initial = cloneSeed()
    writeLocal(initial)
    return initial
  },
}
