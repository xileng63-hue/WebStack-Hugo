export type Category = {
  id: string
  name: string
  emoji: string
  order_index: number
  is_visible: boolean
}

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
  categories: Category[]
  links: NavLink[]
  settings: SiteSettings
}

