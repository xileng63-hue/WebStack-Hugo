import type { Category } from '../types'

export const GROUP_MARKER = '__navigation_group__'

export type NavigationGroup = Pick<Category, 'id' | 'name' | 'order_index' | 'is_visible'>

export const DEFAULT_GROUPS: NavigationGroup[] = [
  { id: 'nav-group-post', name: '后期', order_index: 0, is_visible: true },
  { id: 'nav-group-design', name: '设计', order_index: 1, is_visible: true },
  { id: 'nav-group-daily', name: '日常', order_index: 2, is_visible: true },
  { id: 'nav-group-code', name: '编程', order_index: 3, is_visible: true },
  { id: 'nav-group-assets', name: '素材', order_index: 4, is_visible: true },
  { id: 'nav-group-tools', name: '工具', order_index: 5, is_visible: true },
  { id: 'nav-group-language', name: '外语', order_index: 6, is_visible: true },
  { id: 'nav-group-other', name: '其他', order_index: 7, is_visible: true },
]

const legacyGroupMap: Record<string, string> = {
  常用推荐: 'nav-group-daily',
  '国产 AI': 'nav-group-tools',
  '国外 AI': 'nav-group-tools',
  影音视频: 'nav-group-post',
  游戏竞技: 'nav-group-daily',
  办公学习: 'nav-group-daily',
  网盘资源: 'nav-group-tools',
  图标素材: 'nav-group-assets',
  图标设计: 'nav-group-design',
  平面素材: 'nav-group-assets',
  音效资源: 'nav-group-post',
  字体资源: 'nav-group-assets',
  图形创意: 'nav-group-design',
  界面设计: 'nav-group-design',
  在线配色: 'nav-group-design',
  在线工具: 'nav-group-tools',
  浏览器插件: 'nav-group-code',
  资讯书籍: 'nav-group-language',
  博客论坛: 'nav-group-other',
  设计规范: 'nav-group-design',
  视频教程: 'nav-group-post',
}

export const isGroupRecord = (category: Category) => category.emoji === GROUP_MARKER

export const groupToCategory = (group: NavigationGroup): Category => ({
  ...group,
  emoji: GROUP_MARKER,
})

export const withDefaultGroups = (categories: Category[]): Category[] => {
  const persistedGroups = categories.filter(isGroupRecord)
  const persistedMap = new Map(persistedGroups.map((group) => [group.id, group]))
  const defaults = DEFAULT_GROUPS.map((group) => persistedMap.get(group.id) ?? groupToCategory(group))
  const customGroups = persistedGroups.filter((group) => !DEFAULT_GROUPS.some((item) => item.id === group.id))
  return [...categories.filter((category) => !isGroupRecord(category)), ...defaults, ...customGroups]
}

export const getNavigationGroups = (categories: Category[], includeHidden = false): NavigationGroup[] =>
  withDefaultGroups(categories)
    .filter((category) => isGroupRecord(category) && (includeHidden || category.is_visible))
    .sort((a, b) => a.order_index - b.order_index)
    .map(({ id, name, order_index, is_visible }) => ({ id, name, order_index, is_visible }))

export const getChildCategories = (categories: Category[], includeHidden = false): Category[] =>
  categories
    .filter((category) => !isGroupRecord(category) && (includeHidden || category.is_visible))
    .sort((a, b) => a.order_index - b.order_index)

export const getCategoryGroupId = (category: Category, groups: NavigationGroup[]): string => {
  if (groups.some((group) => group.id === category.emoji)) return category.emoji
  const nameMatch = groups.find((group) => group.name === category.emoji)
  if (nameMatch) return nameMatch.id
  return legacyGroupMap[category.name] ?? groups.find((group) => group.id === 'nav-group-other')?.id ?? groups[0]?.id ?? ''
}

export const getCategoryGroup = (category: Category, categories: Category[]): NavigationGroup | undefined => {
  const groups = getNavigationGroups(categories, true)
  return groups.find((group) => group.id === getCategoryGroupId(category, groups))
}
