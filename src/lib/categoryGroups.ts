import type { Category } from '../types'

export const CATEGORY_GROUPS = ['后期', '设计', '日常', '编程', '素材', '工具', '外语', '其他'] as const

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number]

const legacyGroupMap: Record<string, CategoryGroup> = {
  常用推荐: '日常',
  '国产 AI': '工具',
  '国外 AI': '工具',
  影音视频: '后期',
  游戏竞技: '日常',
  办公学习: '日常',
  网盘资源: '工具',
  图标素材: '素材',
  图标设计: '设计',
  平面素材: '素材',
  音效资源: '后期',
  字体资源: '素材',
  图形创意: '设计',
  界面设计: '设计',
  在线配色: '设计',
  在线工具: '工具',
  浏览器插件: '编程',
  资讯书籍: '外语',
  博客论坛: '其他',
  设计规范: '设计',
  视频教程: '后期',
}

export const getCategoryGroup = (category: Category): CategoryGroup => {
  if (CATEGORY_GROUPS.includes(category.emoji as CategoryGroup)) return category.emoji as CategoryGroup
  return legacyGroupMap[category.name] ?? '其他'
}
