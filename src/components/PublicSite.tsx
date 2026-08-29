import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  LayoutGrid,
  Menu,
  Moon,
  Search,
  Settings2,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import { CATEGORY_GROUPS, getCategoryGroup, type CategoryGroup } from '../lib/categoryGroups'
import type { NavigationData } from '../types'

type Props = {
  data: NavigationData
  onOpenAdmin: () => void
}

type Theme = 'light' | 'dark'

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem('hjcm-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function PublicSite({ data, onOpenAdmin }: Props) {
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<CategoryGroup>('日常')
  const [activeCategory, setActiveCategory] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  const categories = useMemo(
    () => data.categories.filter((item) => item.is_visible).sort((a, b) => a.order_index - b.order_index),
    [data.categories],
  )

  const links = useMemo(
    () => data.links.filter((item) => item.is_visible).sort((a, b) => a.order_index - b.order_index),
    [data.links],
  )

  const normalizedQuery = query.trim().toLocaleLowerCase()

  const groupSummaries = useMemo(
    () => CATEGORY_GROUPS.map((group) => {
      const groupCategoryIds = new Set(categories.filter((category) => getCategoryGroup(category) === group).map((category) => category.id))
      return {
        name: group,
        categories: categories.filter((category) => groupCategoryIds.has(category.id)),
        linkCount: links.filter((link) => groupCategoryIds.has(link.category_id)).length,
      }
    }),
    [categories, links],
  )

  const childCategories = groupSummaries.find((group) => group.name === activeGroup)?.categories ?? []
  const displayedCategories = normalizedQuery
    ? categories
    : childCategories

  const filteredGroups = displayedCategories
    .map((category) => ({
      category,
      links: links.filter((link) => {
        if (link.category_id !== category.id) return false
        if (!normalizedQuery) return true
        return [link.name, link.description, link.url, ...link.tags]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      }),
    }))
    .filter((group) => group.links.length > 0)

  useEffect(() => {
    if (normalizedQuery || filteredGroups.length === 0) return

    const sections = filteredGroups
      .map(({ category }) => document.getElementById(`section-${category.id}`))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveCategory(visible.target.id.replace('section-', ''))
      },
      { rootMargin: '-150px 0px -68% 0px', threshold: 0 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [filteredGroups, normalizedQuery])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('site-search')?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const selectGroup = (group: CategoryGroup) => {
    setActiveGroup(group)
    setActiveCategory('')
    setQuery('')
    setMenuOpen(false)
    document.getElementById('content-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectCategory = (id: string) => {
    setActiveCategory(id)
    setMenuOpen(false)
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('hjcm-theme', nextTheme)
  }

  return (
    <div className="site-shell" data-theme={theme} style={{ '--brand': data.settings.accent } as React.CSSProperties}>
      <header className="topbar">
        <a className="brand" href="#content-start" aria-label="返回顶部">
          <span className="brand-mark">{data.settings.logo_text}</span>
          <span className="brand-copy">
            <strong>{data.settings.title}</strong>
            <small>{categories.length} 个小分类 · {links.length} 个站点</small>
          </span>
        </a>

        <nav className="top-actions" aria-label="页面操作">
          <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label={theme === 'light' ? '切换到夜间模式' : '切换到日间模式'} title={theme === 'light' ? '夜间模式' : '日间模式'}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button className="ghost-button" onClick={onOpenAdmin} type="button">
            <Settings2 size={16} /> 管理后台
          </button>
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
            aria-label={menuOpen ? '关闭分类菜单' : '打开分类菜单'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      <div className="mobile-category-bar">
        <button type="button" onClick={() => setMenuOpen(!menuOpen)}>
          <LayoutGrid size={15} /> 大分类
        </button>
        <span>{activeGroup}</span>
      </div>

      <div className={`mobile-category-drawer ${menuOpen ? 'is-open' : ''}`}>
        {groupSummaries.map((group) => (
          <button type="button" key={group.name} className={activeGroup === group.name ? 'active' : ''} onClick={() => selectGroup(group.name)}>
            <span>{group.name}</span><small>{group.linkCount}</small>
          </button>
        ))}
      </div>

      <main className="directory-layout">
        <aside className="category-sidebar">
          <div className="sidebar-label">大分类</div>
          {groupSummaries.map((group) => (
            <button type="button" key={group.name} className={activeGroup === group.name ? 'active' : ''} onClick={() => selectGroup(group.name)}>
              <span>{group.name}</span><small>{group.linkCount}</small>
            </button>
          ))}
        </aside>

        <div className="directory-content" id="content-start">
          <section className="directory-intro">
            <span className="eyebrow"><Sparkles size={14} /> {data.settings.announcement}</span>
            <div className="intro-copy">
              <div>
                <h1>{activeGroup}</h1>
                <p>{data.settings.subtitle}</p>
              </div>
              <label className="search-box" htmlFor="site-search">
                <Search size={18} />
                <input
                  id="site-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索全部网站、工具或关键词"
                  aria-label="搜索导航内容"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} aria-label="清除搜索"><X size={16} /></button>
                ) : <kbd>⌘ K</kbd>}
              </label>
            </div>

            {!normalizedQuery && (
              <nav className="subcategory-tabs" aria-label={`${activeGroup}的小分类`}>
                {childCategories.map((category) => (
                  <button type="button" key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => selectCategory(category.id)}>
                    {category.name}
                  </button>
                ))}
              </nav>
            )}
          </section>

          {normalizedQuery && <p className="search-result-label">全站搜索结果 · {filteredGroups.reduce((total, group) => total + group.links.length, 0)} 个站点</p>}

          {filteredGroups.length ? filteredGroups.map(({ category, links: groupLinks }) => (
            <section className="link-section" id={`section-${category.id}`} key={category.id}>
              <header className="section-heading">
                <div>
                  <i aria-hidden="true" />
                  <h2>{category.name}</h2>
                  <small>{groupLinks.length} 个站点</small>
                </div>
                <button type="button" onClick={() => document.getElementById('content-start')?.scrollIntoView({ behavior: 'smooth' })}>返回顶部</button>
              </header>
              <div className="link-grid">
                {groupLinks.map((link) => (
                  <a className="link-card" key={link.id} href={link.url} target="_blank" rel="noreferrer">
                    <span className="link-copy">
                      <strong>{link.name}</strong>
                      <small>{link.description || link.url}</small>
                    </span>
                    <ArrowUpRight className="card-arrow" size={16} />
                    {link.tags.length > 0 && (
                      <span className="card-tags">
                        {link.tags.slice(0, 2).map((tag) => <em key={tag}>{tag}</em>)}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )) : (
            <div className="empty-search">
              <Search size={28} />
              <h2>{normalizedQuery ? `没有找到“${query}”` : '这个分类暂时没有内容'}</h2>
              <p>{normalizedQuery ? '换个关键词试试，或者前往管理后台添加它。' : '可以在管理后台给这个大分类添加小分类和链接。'}</p>
              {normalizedQuery && <button type="button" onClick={() => setQuery('')}>清除搜索</button>}
            </div>
          )}
        </div>
      </main>

      <footer>
        <span>{data.settings.footer}</span>
        <button type="button" onClick={onOpenAdmin}>管理入口 <ArrowUpRight size={14} /></button>
      </footer>
    </div>
  )
}
