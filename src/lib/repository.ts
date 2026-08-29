import { seedData } from '../data/seed'
import type { Category, NavigationData, NavLink, SiteSettings } from '../types'
import { isSupabaseConfigured, supabase } from './supabase'

const STORAGE_KEY = 'hjcm-navigation-data-v1'

const cloneSeed = (): NavigationData => JSON.parse(JSON.stringify(seedData)) as NavigationData

const readLocal = (): NavigationData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as NavigationData
  } catch {
    // A clean seed is safer than blocking the public page on malformed local data.
  }
  const initial = cloneSeed()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  return initial
}

const writeLocal = (data: NavigationData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const repository = {
  mode: isSupabaseConfigured ? ('cloud' as const) : ('local' as const),

  async load(): Promise<NavigationData> {
    if (!supabase) return readLocal()

    const [categoriesResult, linksResult, settingsResult] = await Promise.all([
      supabase.from('categories').select('*').order('order_index'),
      supabase.from('links').select('*').order('order_index'),
      supabase.from('site_settings').select('*').eq('id', 'main').maybeSingle(),
    ])

    const error = categoriesResult.error || linksResult.error || settingsResult.error
    if (error) throw error

    return {
      categories: (categoriesResult.data ?? []) as Category[],
      links: (linksResult.data ?? []) as NavLink[],
      settings: (settingsResult.data ?? seedData.settings) as SiteSettings,
    }
  },

  async saveCategory(category: Category, current: NavigationData) {
    if (supabase) {
      const { error } = await supabase.from('categories').upsert(category)
      if (error) throw error
      return
    }
    writeLocal({ ...current, categories: current.categories.some((item) => item.id === category.id)
      ? current.categories.map((item) => item.id === category.id ? category : item)
      : [...current.categories, category] })
  },

  async deleteCategory(id: string, current: NavigationData) {
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      return
    }
    writeLocal({
      ...current,
      categories: current.categories.filter((item) => item.id !== id),
      links: current.links.filter((item) => item.category_id !== id),
    })
  },

  async saveLink(link: NavLink, current: NavigationData) {
    if (supabase) {
      const { error } = await supabase.from('links').upsert(link)
      if (error) throw error
      return
    }
    writeLocal({ ...current, links: current.links.some((item) => item.id === link.id)
      ? current.links.map((item) => item.id === link.id ? link : item)
      : [...current.links, link] })
  },

  async deleteLink(id: string, current: NavigationData) {
    if (supabase) {
      const { error } = await supabase.from('links').delete().eq('id', id)
      if (error) throw error
      return
    }
    writeLocal({ ...current, links: current.links.filter((item) => item.id !== id) })
  },

  async saveSettings(settings: SiteSettings, current: NavigationData) {
    if (supabase) {
      const { error } = await supabase.from('site_settings').upsert(settings)
      if (error) throw error
      return
    }
    writeLocal({ ...current, settings })
  },

  async saveOrder(categories: Category[], links: NavLink[], current: NavigationData) {
    if (supabase) {
      const [categoryResult, linkResult] = await Promise.all([
        categories.length ? supabase.from('categories').upsert(categories) : Promise.resolve({ error: null }),
        links.length ? supabase.from('links').upsert(links) : Promise.resolve({ error: null }),
      ])
      if (categoryResult.error || linkResult.error) throw categoryResult.error || linkResult.error
      return
    }
    writeLocal({ ...current, categories, links })
  },

  async importData(data: NavigationData) {
    if (supabase) {
      const categoryResult = await supabase.from('categories').upsert(data.categories)
      if (categoryResult.error) throw categoryResult.error
      const linkResult = await supabase.from('links').upsert(data.links)
      if (linkResult.error) throw linkResult.error
      const settingsResult = await supabase.from('site_settings').upsert(data.settings)
      if (settingsResult.error) throw settingsResult.error
      return
    }
    writeLocal(data)
  },

  resetLocal(): NavigationData {
    const initial = cloneSeed()
    writeLocal(initial)
    return initial
  },
}

