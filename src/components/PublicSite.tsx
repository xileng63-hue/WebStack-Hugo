import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  ChevronRight,
  Command,
  LayoutGrid,
  Menu,
  Search,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import type { NavigationData, NavLink } from '../types'

type Props = {
  data: NavigationData
  onOpenAdmin: () => void
}

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase()

function LinkIcon({ link }: { link: NavLink }) {
  const [failed, setFailed] = useState(false)

  if (link.icon_url && !failed) {
    return <img src={link.icon_url} alt="" onError={() => setFailed(true)} />
  }

  return (
    <span className="letter-icon" style={{ background: `${link.accent}18`, color: link.accent }}>
      {initials(link.name)}
    </span>
  )
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

  const featured = links.filter((item) => item.is_featured).slice(0, 4)
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const filteredGroups = categories
    .filter((category) => activeCategory === 'all' || category.id === activeCategory)
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

  const selectCategory = (id: string) => {
    setActiveCategory(id)
    setMenuOpen(false)
    if (id !== 'all') {
      requestAnimationFrame(() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth' }))
    }
  }

  return (
    <div className="site-shell" style={{ '--brand': data.settings.accent } as React.CSSProperties}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回顶部">
          <span className="brand-mark">{data.settings.logo_text}</span>
          <span className="brand-copy">
            <strong>{data.settings.title}</strong>
            <small>CURATED DIRECTORY</small>
          </span>
        </a>

        <nav className="top-actions" aria-label="页面操作">
          <span className="shortcut"><Command size={14} /> K 快速搜索</span>
          <button className="ghost-button" onClick={onOpenAdmin} type="button">
            <Settings2 size={17} /> 管理后台
          </button>
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} type="button" aria-label="打开分类">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> {data.settings.announcement}</span>
            <h1>去你想去的地方，<br /><em>快一点。</em></h1>
            <p>{data.settings.subtitle}</p>
            <label className="search-box">
              <Search size={21} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索网站、工具或关键词…"
                aria-label="搜索导航内容"
              />
              {query && <button type="button" onClick={() => setQuery('')}><X size={17} /></button>}
              <kbd>⌘ K</kbd>
            </label>
            <div className="hero-meta">
              <span><b>{categories.length}</b> 个分类</span>
              <span><b>{links.length}</b> 个精选站点</span>
              <span>持续整理中</span>
            </div>
          </div>

          <div className="featured-stack" aria-label="常用站点">
            <div className="featured-heading"><span>今日常用</span><small>QUICK ACCESS</small></div>
            {featured.map((link, index) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="featured-item">
                <span className="featured-index">0{index + 1}</span>
                <span className="site-icon"><LinkIcon link={link} /></span>
                <span><strong>{link.name}</strong><small>{link.description}</small></span>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>
        </section>

        <div className={`mobile-category-drawer ${menuOpen ? 'is-open' : ''}`}>
          <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>全部分类</button>
          {categories.map((category) => (
            <button type="button" key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => selectCategory(category.id)}>
              {category.emoji} {category.name}
            </button>
          ))}
        </div>

        <section className="directory-layout">
          <aside className="category-sidebar">
            <div className="sidebar-label"><LayoutGrid size={15} /> 资源分类</div>
            <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>
              <span className="category-symbol">全</span><span>全部分类</span><small>{links.length}</small>
            </button>
            {categories.map((category) => (
              <button type="button" key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => selectCategory(category.id)}>
                <span className="category-symbol">{category.emoji}</span><span>{category.name}</span>
                <small>{links.filter((link) => link.category_id === category.id).length}</small>
              </button>
            ))}
          </aside>

          <div className="directory-content">
            {filteredGroups.length ? filteredGroups.map(({ category, links: groupLinks }) => (
              <section className="link-section" id={`section-${category.id}`} key={category.id}>
                <header className="section-heading">
                  <div><span className="section-symbol">{category.emoji}</span><h2>{category.name}</h2><small>{groupLinks.length} SITES</small></div>
                  <button type="button" onClick={() => selectCategory(category.id)}>只看此类 <ChevronRight size={15} /></button>
                </header>
                <div className="link-grid">
                  {groupLinks.map((link) => (
                    <a className="link-card" key={link.id} href={link.url} target="_blank" rel="noreferrer">
                      <span className="site-icon"><LinkIcon link={link} /></span>
                      <span className="link-copy"><strong>{link.name}</strong><small>{link.description || link.url}</small></span>
                      <ArrowUpRight className="card-arrow" size={17} />
                    </a>
                  ))}
                </div>
              </section>
            )) : (
              <div className="empty-search">
                <Search size={30} />
                <h2>没有找到“{query}”</h2>
                <p>换个关键词试试，或者前往管理后台添加它。</p>
                <button type="button" onClick={() => setQuery('')}>清除搜索</button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer>
        <span>{data.settings.footer}</span>
        <button type="button" onClick={onOpenAdmin}>管理入口 <ArrowUpRight size={14} /></button>
      </footer>
    </div>
  )
}

