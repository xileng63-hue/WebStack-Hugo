import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  LayoutGrid,
  Menu,
  Search,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import type { NavigationData } from '../types'

type Props = {
  data: NavigationData
  onOpenAdmin: () => void
}

export function PublicSite({ data, onOpenAdmin }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)

  const categories = useMemo(
    () => data.categories.filter((item) => item.is_visible).sort((a, b) => a.order_index - b.order_index),
    [data.categories],
  )

  const links = useMemo(
    () => data.links.filter((item) => item.is_visible).sort((a, b) => a.order_index - b.order_index),
    [data.links],
  )

  const categoryCounts = useMemo(
    () => new Map(categories.map((category) => [
      category.id,
      links.filter((link) => link.category_id === category.id).length,
    ])),
    [categories, links],
  )

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredGroups = categories
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
    if (normalizedQuery) return

    const sections = categories
      .map((category) => document.getElementById(`section-${category.id}`))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveCategory(visible.target.id.replace('section-', ''))
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [categories, normalizedQuery])

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

  const selectCategory = (id: string) => {
    setActiveCategory(id)
    setMenuOpen(false)
    const target = id === 'all' ? document.getElementById('directory-top') : document.getElementById(`section-${id}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="site-shell" style={{ '--brand': data.settings.accent } as React.CSSProperties}>
      <header className="topbar">
        <a className="brand" href="#directory-top" aria-label="返回顶部">
          <span className="brand-mark">{data.settings.logo_text}</span>
          <span className="brand-copy">
            <strong>{data.settings.title}</strong>
            <small>{categories.length} 个分类 · {links.length} 个站点</small>
          </span>
        </a>

        <nav className="top-actions" aria-label="页面操作">
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
          <LayoutGrid size={15} /> 浏览分类
        </button>
        <span>{activeCategory === 'all' ? '全部分类' : categories.find((item) => item.id === activeCategory)?.name}</span>
      </div>

      <div className={`mobile-category-drawer ${menuOpen ? 'is-open' : ''}`}>
        <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>
          <span>全部分类</span><small>{links.length}</small>
        </button>
        {categories.map((category) => (
          <button type="button" key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => selectCategory(category.id)}>
            <span>{category.emoji} {category.name}</span><small>{categoryCounts.get(category.id)}</small>
          </button>
        ))}
      </div>

      <main className="directory-layout" id="directory-top">
        <aside className="category-sidebar">
          <div className="sidebar-label"><LayoutGrid size={14} /> 站点分类</div>
          <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>
            <span className="category-symbol">全</span><span>全部分类</span><small>{links.length}</small>
          </button>
          {categories.map((category) => (
            <button type="button" key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => selectCategory(category.id)}>
              <span className="category-symbol">{category.emoji}</span><span>{category.name}</span>
              <small>{categoryCounts.get(category.id)}</small>
            </button>
          ))}
        </aside>

        <div className="directory-content">
          <section className="directory-intro">
            <span className="eyebrow"><Sparkles size={14} /> {data.settings.announcement}</span>
            <div className="intro-copy">
              <div>
                <h1>{data.settings.title}</h1>
                <p>{data.settings.subtitle}</p>
              </div>
              <label className="search-box" htmlFor="site-search">
                <Search size={18} />
                <input
                  id="site-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索网站、工具或关键词"
                  aria-label="搜索导航内容"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} aria-label="清除搜索"><X size={16} /></button>
                ) : <kbd>⌘ K</kbd>}
              </label>
            </div>
          </section>

          {filteredGroups.length ? filteredGroups.map(({ category, links: groupLinks }) => (
            <section className="link-section" id={`section-${category.id}`} key={category.id}>
              <header className="section-heading">
                <div>
                  <i aria-hidden="true" />
                  <h2>{category.name}</h2>
                  <small>{groupLinks.length} 个站点</small>
                </div>
                <button type="button" onClick={() => selectCategory('all')}>返回顶部</button>
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
              <h2>没有找到“{query}”</h2>
              <p>换个关键词试试，或者前往管理后台添加它。</p>
              <button type="button" onClick={() => setQuery('')}>清除搜索</button>
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
