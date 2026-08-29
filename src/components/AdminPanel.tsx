import { useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FolderKanban,
  LayoutDashboard,
  Link2,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { seedData } from '../data/seed'
import { repository } from '../lib/repository'
import type { Category, NavigationData, NavLink, SiteSettings } from '../types'

type Tab = 'overview' | 'links' | 'categories' | 'appearance' | 'data'

type Props = {
  data: NavigationData
  setData: React.Dispatch<React.SetStateAction<NavigationData>>
  cloudMode: boolean
  userEmail?: string
  onClose: () => void
  onSignOut: () => void
}

const newCategory = (order: number): Category => ({
  id: crypto.randomUUID(),
  name: '',
  emoji: '新',
  order_index: order,
  is_visible: true,
})

const newLink = (categoryId: string, order: number): NavLink => ({
  id: crypto.randomUUID(),
  category_id: categoryId,
  name: '',
  url: 'https://',
  description: '',
  icon_url: '',
  accent: '#6d5dfc',
  tags: [],
  order_index: order,
  is_visible: true,
  is_featured: false,
})

export function AdminPanel({ data, setData, cloudMode, userEmail, onClose, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingLink, setEditingLink] = useState<NavLink | null>(null)
  const [linkCategory, setLinkCategory] = useState('all')
  const [linkSearch, setLinkSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const categories = [...data.categories].sort((a, b) => a.order_index - b.order_index)
  const links = [...data.links].sort((a, b) => a.order_index - b.order_index)
  const filteredLinks = links.filter((link) => {
    if (linkCategory !== 'all' && link.category_id !== linkCategory) return false
    const query = linkSearch.trim().toLowerCase()
    return !query || `${link.name} ${link.description} ${link.url}`.toLowerCase().includes(query)
  })

  const categoryMap = useMemo(() => new Map(data.categories.map((item) => [item.id, item.name])), [data.categories])

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true)
    setError('')
    try {
      await action()
      setNotice(success)
      window.setTimeout(() => setNotice(''), 2200)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  const saveCategory = async () => {
    if (!editingCategory?.name.trim()) return setError('分类名称不能为空。')
    const value = { ...editingCategory, name: editingCategory.name.trim() }
    await run(async () => {
      await repository.saveCategory(value, data)
      setData((current) => ({
        ...current,
        categories: current.categories.some((item) => item.id === value.id)
          ? current.categories.map((item) => item.id === value.id ? value : item)
          : [...current.categories, value],
      }))
      setEditingCategory(null)
    }, '分类已保存')
  }

  const saveLink = async () => {
    if (!editingLink?.name.trim() || !editingLink.url.trim()) return setError('名称和网址不能为空。')
    try {
      new URL(editingLink.url)
    } catch {
      return setError('请输入包含 http:// 或 https:// 的完整网址。')
    }
    const value = { ...editingLink, name: editingLink.name.trim(), url: editingLink.url.trim() }
    await run(async () => {
      await repository.saveLink(value, data)
      setData((current) => ({
        ...current,
        links: current.links.some((item) => item.id === value.id)
          ? current.links.map((item) => item.id === value.id ? value : item)
          : [...current.links, value],
      }))
      setEditingLink(null)
    }, '链接已保存')
  }

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`删除“${category.name}”及其中全部链接？此操作无法撤销。`)) return
    await run(async () => {
      await repository.deleteCategory(category.id, data)
      setData((current) => ({
        ...current,
        categories: current.categories.filter((item) => item.id !== category.id),
        links: current.links.filter((item) => item.category_id !== category.id),
      }))
    }, '分类已删除')
  }

  const deleteLink = async (link: NavLink) => {
    if (!window.confirm(`确认删除“${link.name}”？`)) return
    await run(async () => {
      await repository.deleteLink(link.id, data)
      setData((current) => ({ ...current, links: current.links.filter((item) => item.id !== link.id) }))
    }, '链接已删除')
  }

  const toggleCategory = (category: Category) => {
    const value = { ...category, is_visible: !category.is_visible }
    void run(async () => {
      await repository.saveCategory(value, data)
      setData((current) => ({ ...current, categories: current.categories.map((item) => item.id === value.id ? value : item) }))
    }, value.is_visible ? '分类已显示' : '分类已隐藏')
  }

  const toggleLink = (link: NavLink) => {
    const value = { ...link, is_visible: !link.is_visible }
    void run(async () => {
      await repository.saveLink(value, data)
      setData((current) => ({ ...current, links: current.links.map((item) => item.id === value.id ? value : item) }))
    }, value.is_visible ? '链接已显示' : '链接已隐藏')
  }

  const moveCategory = (id: string, direction: -1 | 1) => {
    const ordered = categories
    const index = ordered.findIndex((item) => item.id === id)
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    const updated = ordered.map((item, order_index) => ({ ...item, order_index }))
    void run(async () => {
      await repository.saveOrder(updated, data.links, data)
      setData((current) => ({ ...current, categories: updated }))
    }, '分类顺序已更新')
  }

  const moveLink = (link: NavLink, direction: -1 | 1) => {
    const siblings = links.filter((item) => item.category_id === link.category_id)
    const index = siblings.findIndex((item) => item.id === link.id)
    const target = index + direction
    if (target < 0 || target >= siblings.length) return
    ;[siblings[index], siblings[target]] = [siblings[target], siblings[index]]
    const reordered = siblings.map((item, order_index) => ({ ...item, order_index }))
    const idSet = new Set(reordered.map((item) => item.id))
    const updatedLinks = [...data.links.filter((item) => !idSet.has(item.id)), ...reordered]
    void run(async () => {
      await repository.saveOrder(data.categories, reordered, data)
      setData((current) => ({ ...current, links: updatedLinks }))
    }, '链接顺序已更新')
  }

  const saveSettings = (settings: SiteSettings) => {
    void run(async () => {
      await repository.saveSettings(settings, data)
      setData((current) => ({ ...current, settings }))
    }, '站点设置已保存')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `hjcm-navigation-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('备份已导出')
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as NavigationData
      if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.links) || !parsed.settings) throw new Error('文件格式不正确。')
      await run(async () => {
        await repository.importData(parsed)
        setData(parsed)
      }, '数据已导入')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取该文件。')
    }
  }

  const importSeed = () => {
    if (!window.confirm(cloudMode ? '把旧站初始内容写入云端数据库？已有同 ID 内容会被更新。' : '恢复旧站初始内容？当前浏览器中的修改会被覆盖。')) return
    void run(async () => {
      await repository.importData(seedData)
      setData(JSON.parse(JSON.stringify(seedData)) as NavigationData)
    }, '旧站内容已导入')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span>{data.settings.logo_text}</span><div><strong>导航管理台</strong><small>CONTENT STUDIO</small></div></div>
        <nav>
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><LayoutDashboard size={18} />概览</button>
          <button className={tab === 'links' ? 'active' : ''} onClick={() => setTab('links')}><Link2 size={18} />链接管理</button>
          <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}><FolderKanban size={18} />分类管理</button>
          <button className={tab === 'appearance' ? 'active' : ''} onClick={() => setTab('appearance')}><Settings size={18} />站点设置</button>
          <button className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}><FileJson size={18} />数据与备份</button>
        </nav>
        <div className="admin-account">
          <span className={`status-dot ${cloudMode ? 'cloud' : ''}`} />
          <div><strong>{cloudMode ? '云端数据库' : '本地演示模式'}</strong><small>{userEmail || '数据仅保存在当前浏览器'}</small></div>
          {cloudMode && <button type="button" onClick={onSignOut} title="退出登录"><LogOut size={16} /></button>}
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><span className="admin-kicker">HJCM / ADMIN</span><h1>{({ overview: '内容概览', links: '链接管理', categories: '分类管理', appearance: '站点设置', data: '数据与备份' } as const)[tab]}</h1></div>
          <button className="preview-button" type="button" onClick={onClose}><ArrowLeft size={17} /> 返回网站</button>
        </header>

        {notice && <div className="toast success"><Check size={17} />{notice}</div>}
        {error && <div className="toast error"><X size={17} />{error}<button onClick={() => setError('')}><X size={14} /></button></div>}

        {tab === 'overview' && (
          <div className="admin-page">
            <div className="metric-grid">
              <article><span>链接总数</span><strong>{links.length}</strong><small>{links.filter((item) => item.is_visible).length} 个公开显示</small></article>
              <article><span>分类总数</span><strong>{categories.length}</strong><small>{categories.filter((item) => item.is_visible).length} 个公开显示</small></article>
              <article><span>首页推荐</span><strong>{links.filter((item) => item.is_featured).length}</strong><small>最多展示前 4 个</small></article>
              <article><span>数据模式</span><strong className="metric-word">{cloudMode ? '云端' : '本地'}</strong><small>{cloudMode ? '多设备同步生效' : '适合预览与设计'}</small></article>
            </div>
            <div className="admin-grid-two">
              <section className="admin-card">
                <header><div><span>快速操作</span><h2>继续完善你的导航</h2></div></header>
                <div className="quick-actions">
                  <button onClick={() => { setTab('links'); setEditingLink(newLink(categories[0]?.id || '', links.length)) }}><Plus size={18} /><span><strong>添加链接</strong><small>录入一个新网站</small></span></button>
                  <button onClick={() => { setTab('categories'); setEditingCategory(newCategory(categories.length)) }}><FolderKanban size={18} /><span><strong>添加分类</strong><small>整理内容结构</small></span></button>
                  <button onClick={() => setTab('appearance')}><Settings size={18} /><span><strong>修改文案</strong><small>调整标题与品牌色</small></span></button>
                </div>
              </section>
              <section className="admin-card">
                <header><div><span>最近内容</span><h2>当前推荐链接</h2></div><button onClick={() => setTab('links')}>查看全部</button></header>
                <div className="compact-list">
                  {links.filter((item) => item.is_featured).slice(0, 5).map((link) => <div key={link.id}><span style={{ background: link.accent }}>{link.name.slice(0, 1)}</span><div><strong>{link.name}</strong><small>{categoryMap.get(link.category_id)}</small></div><a href={link.url} target="_blank" rel="noreferrer">访问</a></div>)}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div className="admin-page">
            <div className="table-toolbar"><p>分类决定公开页面的内容结构与显示顺序。</p><button className="primary-button" onClick={() => setEditingCategory(newCategory(categories.length))}><Plus size={17} /> 新建分类</button></div>
            <section className="data-table category-table">
              <div className="table-head"><span>分类</span><span>链接数</span><span>状态</span><span>排序</span><span>操作</span></div>
              {categories.map((category) => (
                <div className="table-row" key={category.id}>
                  <span className="category-cell"><i>{category.emoji}</i><strong>{category.name}</strong></span>
                  <span>{links.filter((link) => link.category_id === category.id).length}</span>
                  <button className={`status-pill ${category.is_visible ? 'visible' : ''}`} onClick={() => toggleCategory(category)}>{category.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}{category.is_visible ? '显示' : '隐藏'}</button>
                  <span className="order-actions"><button onClick={() => moveCategory(category.id, -1)}><ArrowUp size={15} /></button><button onClick={() => moveCategory(category.id, 1)}><ArrowDown size={15} /></button></span>
                  <span className="row-actions"><button onClick={() => setEditingCategory({ ...category })}><Pencil size={15} /></button><button className="danger" onClick={() => deleteCategory(category)}><Trash2 size={15} /></button></span>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'links' && (
          <div className="admin-page">
            <div className="table-toolbar link-toolbar">
              <label><Search size={17} /><input placeholder="搜索链接…" value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} /></label>
              <select value={linkCategory} onChange={(event) => setLinkCategory(event.target.value)}><option value="all">全部分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <button className="primary-button" onClick={() => setEditingLink(newLink(categories[0]?.id || '', links.length))}><Plus size={17} /> 新建链接</button>
            </div>
            <section className="data-table link-table">
              <div className="table-head"><span>网站</span><span>分类</span><span>状态</span><span>排序</span><span>操作</span></div>
              {filteredLinks.map((link) => (
                <div className="table-row" key={link.id}>
                  <span className="link-cell"><i style={{ background: `${link.accent}18`, color: link.accent }}>{link.name.slice(0, 2)}</i><span><strong>{link.name}{link.is_featured && <em>推荐</em>}</strong><small>{link.url}</small></span></span>
                  <span>{categoryMap.get(link.category_id) || '未分类'}</span>
                  <button className={`status-pill ${link.is_visible ? 'visible' : ''}`} onClick={() => toggleLink(link)}>{link.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}{link.is_visible ? '显示' : '隐藏'}</button>
                  <span className="order-actions"><button onClick={() => moveLink(link, -1)}><ArrowUp size={15} /></button><button onClick={() => moveLink(link, 1)}><ArrowDown size={15} /></button></span>
                  <span className="row-actions"><button onClick={() => setEditingLink({ ...link })}><Pencil size={15} /></button><button className="danger" onClick={() => deleteLink(link)}><Trash2 size={15} /></button></span>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'appearance' && <SettingsForm settings={data.settings} onSave={saveSettings} busy={busy} />}

        {tab === 'data' && (
          <div className="admin-page data-page">
            <section className="admin-card data-card"><span className="data-icon"><Download size={22} /></span><div><h2>导出完整备份</h2><p>下载分类、链接和站点设置的 JSON 文件，可随时恢复或迁移。</p></div><button onClick={exportData}>导出 JSON</button></section>
            <section className="admin-card data-card"><span className="data-icon"><Upload size={22} /></span><div><h2>从备份导入</h2><p>导入由本项目导出的 JSON 文件。云端模式会更新相同 ID 的内容。</p></div><button onClick={() => importRef.current?.click()}>选择文件</button><input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => importFile(event.target.files?.[0])} /></section>
            <section className="admin-card data-card"><span className="data-icon"><FileJson size={22} /></span><div><h2>载入旧站初始内容</h2><p>恢复从 WebStack-Hugo 旧站迁移出的 21 个分类与全部有效链接。</p></div><button onClick={importSeed}>载入数据</button></section>
            {!cloudMode && <div className="mode-notice"><strong>当前是本地演示模式</strong><p>所有编辑只保存在这台设备的浏览器中。按 README 接入 Supabase 后，即可获得登录保护和多设备同步。</p></div>}
          </div>
        )}
      </main>

      {editingCategory && (
        <div className="editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditingCategory(null)}>
          <section className="editor-panel"><header><div><span>CATEGORY</span><h2>{data.categories.some((item) => item.id === editingCategory.id) ? '编辑分类' : '新建分类'}</h2></div><button onClick={() => setEditingCategory(null)}><X /></button></header><div className="editor-fields"><label><span>分类名称</span><input autoFocus value={editingCategory.name} onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })} placeholder="例如：AI 工具" /></label><label><span>分类标识</span><input maxLength={2} value={editingCategory.emoji} onChange={(event) => setEditingCategory({ ...editingCategory, emoji: event.target.value })} placeholder="AI" /></label><label className="switch-field"><input type="checkbox" checked={editingCategory.is_visible} onChange={(event) => setEditingCategory({ ...editingCategory, is_visible: event.target.checked })} /><span>在公开页面显示此分类</span></label></div><footer><button onClick={() => setEditingCategory(null)}>取消</button><button className="primary-button" disabled={busy} onClick={saveCategory}>保存分类</button></footer></section>
        </div>
      )}

      {editingLink && (
        <div className="editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditingLink(null)}>
          <section className="editor-panel link-editor"><header><div><span>WEBSITE</span><h2>{data.links.some((item) => item.id === editingLink.id) ? '编辑链接' : '添加链接'}</h2></div><button onClick={() => setEditingLink(null)}><X /></button></header><div className="editor-fields two-column"><label><span>网站名称</span><input autoFocus value={editingLink.name} onChange={(event) => setEditingLink({ ...editingLink, name: event.target.value })} placeholder="网站名称" /></label><label><span>所属分类</span><select value={editingLink.category_id} onChange={(event) => setEditingLink({ ...editingLink, category_id: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="wide"><span>完整网址</span><input value={editingLink.url} onChange={(event) => setEditingLink({ ...editingLink, url: event.target.value })} placeholder="https://example.com" /></label><label className="wide"><span>一句话描述</span><input value={editingLink.description} onChange={(event) => setEditingLink({ ...editingLink, description: event.target.value })} placeholder="告诉访客这个网站能做什么" /></label><label className="wide"><span>自定义图标 URL（可选）</span><input value={editingLink.icon_url} onChange={(event) => setEditingLink({ ...editingLink, icon_url: event.target.value })} placeholder="https://.../logo.png" /></label><label><span>卡片强调色</span><input type="color" value={editingLink.accent} onChange={(event) => setEditingLink({ ...editingLink, accent: event.target.value })} /></label><label><span>标签（逗号分隔）</span><input value={editingLink.tags.join(', ')} onChange={(event) => setEditingLink({ ...editingLink, tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="AI, 设计" /></label><label className="switch-field"><input type="checkbox" checked={editingLink.is_visible} onChange={(event) => setEditingLink({ ...editingLink, is_visible: event.target.checked })} /><span>公开显示</span></label><label className="switch-field"><input type="checkbox" checked={editingLink.is_featured} onChange={(event) => setEditingLink({ ...editingLink, is_featured: event.target.checked })} /><span>首页推荐</span></label></div><footer><button onClick={() => setEditingLink(null)}>取消</button><button className="primary-button" disabled={busy} onClick={saveLink}>保存链接</button></footer></section>
        </div>
      )}
    </div>
  )
}

function SettingsForm({ settings, onSave, busy }: { settings: SiteSettings; onSave: (settings: SiteSettings) => void; busy: boolean }) {
  const [draft, setDraft] = useState({ ...settings })

  return (
    <div className="admin-page settings-page">
      <section className="settings-form admin-card">
        <header><div><span>公开页面</span><h2>品牌与文案</h2></div></header>
        <div className="editor-fields two-column">
          <label><span>站点名称</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label><span>Logo 文字</span><input maxLength={3} value={draft.logo_text} onChange={(event) => setDraft({ ...draft, logo_text: event.target.value })} /></label>
          <label className="wide"><span>首页介绍</span><textarea rows={3} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
          <label className="wide"><span>顶部公告</span><input value={draft.announcement} onChange={(event) => setDraft({ ...draft, announcement: event.target.value })} /></label>
          <label className="wide"><span>页脚文字</span><input value={draft.footer} onChange={(event) => setDraft({ ...draft, footer: event.target.value })} /></label>
          <label><span>品牌主色</span><div className="color-input"><input type="color" value={draft.accent} onChange={(event) => setDraft({ ...draft, accent: event.target.value })} /><code>{draft.accent}</code></div></label>
        </div>
        <footer><button className="primary-button" disabled={busy} onClick={() => onSave(draft)}>保存站点设置</button></footer>
      </section>
      <section className="settings-preview" style={{ '--preview-accent': draft.accent } as React.CSSProperties}><span>实时预览</span><div className="preview-logo">{draft.logo_text}</div><small>{draft.announcement}</small><h2>{draft.title}</h2><p>{draft.subtitle}</p></section>
    </div>
  )
}

