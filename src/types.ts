export type CategoryGroup = {
  id: string
  name: string
  order_index: number
  is_visible: boolean
  is_pinned: boolean
}

export type Category = {
  id: string
  name: string
  group_id: string
  order_index: number
  is_visible: boolean
  is_pinned: boolean
}

export type LinkHealthStatus = 'unchecked' | 'healthy' | 'redirected' | 'broken'

export type NavLink = {
  id: string
  category_id: string
  name: string
  url: string
  description: string
  icon_url: string
  accent: string
  tags: string[]
  order_index: number
  is_visible: boolean
  is_featured: boolean
  is_pinned: boolean
  health_status: LinkHealthStatus
  http_status: number | null
  last_checked_at: string | null
  final_url: string
  health_error: string
}

export type SiteSettings = {
  id: 'main'
  title: string
  subtitle: string
  announcement: string
  footer: string
  logo_text: string
  accent: string
}

export type NavigationData = {
  groups: CategoryGroup[]
  categories: Category[]
  links: NavLink[]
  settings: SiteSettings
}

export type NavigationDeleteSet = {
  groupIds: string[]
  categoryIds: string[]
  linkIds: string[]
}
