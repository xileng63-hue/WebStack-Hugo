import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FolderKanban,
  GripVertical,
  LayoutDashboard,
  Layers3,
  Link2,
  LogOut,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Square,
  CheckSquare,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { seedData } from '../data/seed'
import { repository } from '../lib/repository'
import { supabase } from '../lib/supabase'
import type {
  Category,
  CategoryGroup,
  LinkHealthStatus,
  NavigationData,
  NavigationDeleteSet,
  NavLink,
  SiteSettings,
} from '../types'

type Tab = 'overview' | 'links' | 'categories' | 'appearance' | 'data'
type DragItem = { kind: 'group' | 'category' | 'link'; id: string }
type VisibilityFilter = 'all' | 'visible' | 'hidden'
type HealthFilter = 'all' | LinkHealthStatus | 'duplicate'

type Props = {
  data: NavigationData
  setData: React.Dispatch<React.SetStateAction<NavigationData>>
  cloudMode: boolean
  userEmail?: string
  onClose: () => void
  onSignOut: () => void
}

const emptyDeleted = (): NavigationDeleteSet => ({ groupIds: [], categoryIds: [], linkIds: [] })
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const byPosition = <T extends { is_pinned: boolean; order_index: number }>(a: T, b: T) =>
  Number(b.is_pinned) - Number(a.is_pinned) || a.order_index - b.order_index
const compactOrder = <T extends { order_index: number }>(items: T[]) => items.map((item, order_index) => ({ ...item, order_index }))

const newGroup = (order: number): CategoryGroup => ({
  id: crypto.randomUUID(), name: '', order_index: order, is_visible: true, is_pinned: false,
})
const newCategory = (groupId: string, order: number): Category => ({
  id: crypto.randomUUID(), name: '', group_id: groupId, order_index: order, is_visible: true, is_pinned: false,
})
const newLink = (categoryId: string, order: number): NavLink => ({
  id: crypto.randomUUID(), category_id: categoryId, name: '', url: 'https://', description: '', icon_url: '',
  accent: '#6d5dfc', tags: [], order_index: order, is_visible: true, is_featured: false, is_pinned: false,
  health_status: 'unchecked', http_status: null, last_checked_at: null, final_url: '', health_error: '',
})

const normalizeUrl = (value: string) => {
  try {
    const url = new URL(value.trim())
    url.hash = ''
    url.hostname = url.hostname.toLowerCase()
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString().replace(/\/$/, '')
  } catch {
    return value.trim().toLowerCase()
  }
}

const formatCheckedAt = (value: string | null) => value
  ? new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '尚未检测'

export function AdminPanel({ data, setData, cloudMode, userEmail, onClose, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [draft, setDraft] = useState<NavigationData>(() => clone(data))
  const [deleted, setDeleted] = useState<NavigationDeleteSet>(emptyDeleted)
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingLink, setEditingLink] = useState<NavLink | null>(null)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryGroupFilter, setCategoryGroupFilter] = useState('all')
  const [categoryVisibility, setCategoryVisibility] = useState<VisibilityFilter>('all')
  const [linkSearch, setLinkSearch] = useState('')
  const [linkCategory, setLinkCategory] = useState('all')
  const [linkVisibility, setLinkVisibility] = useState<VisibilityFilter>('all')
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set())
  const [moveCategoryTarget, setMoveCategoryTarget] = useState('')
  const [moveLinkTarget, setMoveLinkTarget] = useState('')
  const [dragging, setDragging] = useState<DragItem | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(data)
      || deleted.groupIds.length + deleted.categoryIds.length + deleted.linkIds.length > 0,
    [data, deleted, draft],
  )
  const groups = useMemo(() => [...draft.groups].sort(byPosition), [draft.groups])
  const categories = useMemo(() => [...draft.categories].sort(byPosition), [draft.categories])
  const links = useMemo(() => [...draft.links].sort(byPosition), [draft.links])
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories])
  const groupMap = useMemo(() => new Map(groups.map((item) => [item.id, item.name])), [groups])
  const originalGroupIds = useMemo(() => new Set(data.groups.map((item) => item.id)), [data.groups])
  const originalCategoryIds = useMemo(() => new Set(data.categories.map((item) => item.id)), [data.categories])
  const originalLinkIds = useMemo(() => new Set(data.links.map((item) => item.id)), [data.links])

  const duplicateIds = useMemo(() => {
    const urls = new Map<string, string[]>()
    links.forEach((link) => {
      const key = normalizeUrl(link.url)
      if (!key || key === 'https:') return
      urls.set(key, [...(urls.get(key) ?? []), link.id])
    })
    return new Set([...urls.values()].filter((ids) => ids.length > 1).flat())
  }, [links])

  const filteredCategories = useMemo(() => categories.filter((category) => {
    const query = categorySearch.trim().toLowerCase()
    if (query && !`${category.name} ${groupMap.get(category.group_id) ?? ''}`.toLowerCase().includes(query)) return false
    if (categoryGroupFilter !== 'all' && category.group_id !== categoryGroupFilter) return false
    if (categoryVisibility === 'visible' && !category.is_visible) return false
    if (categoryVisibility === 'hidden' && category.is_visible) return false
    return true
  }), [categories, categoryGroupFilter, categorySearch, categoryVisibility, groupMap])

  const filteredLinks = useMemo(() => links.filter((link) => {
    const query = linkSearch.trim().toLowerCase()
    if (query && !`${link.name} ${link.description} ${link.url} ${link.tags.join(' ')}`.toLowerCase().includes(query)) return false
    if (linkCategory !== 'all' && link.category_id !== linkCategory) return false
    if (linkVisibility === 'visible' && !link.is_visible) return false
    if (linkVisibility === 'hidden' && link.is_visible) return false
    if (healthFilter === 'duplicate' && !duplicateIds.has(link.id)) return false
    if (!['all', 'duplicate'].includes(healthFilter) && link.health_status !== healthFilter) return false
    return true
  }), [duplicateIds, healthFilter, linkCategory, linkSearch, linkVisibility, links])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }
  const markDeleted = (kind: keyof NavigationDeleteSet, ids: string[], originalIds: Set<string>) => {
    const persisted = ids.filter((id) => originalIds.has(id))
    setDeleted((current) => ({ ...current, [kind]: [...new Set([...current[kind], ...persisted])] }))
  }
  const updateGroups = (items: CategoryGroup[]) => setDraft((current) => ({ ...current, groups: items }))
  const updateCategories = (items: Category[]) => setDraft((current) => ({ ...current, categories: items }))
  const updateLinks = (items: NavLink[]) => setDraft((current) => ({ ...current, links: items }))

  const saveAll = async () => {
    setBusy(true)
    setError('')
    try {
      await repository.saveBatch(draft, deleted)
      const saved = clone(draft)
      setData(saved)
      setDraft(clone(saved))
      setDeleted(emptyDeleted())
      flash('全部修改已一次性保存')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  const discardAll = () => {
    if (dirty && !window.confirm('放弃所有尚未保存的修改？')) return
    setDraft(clone(data))
    setDeleted(emptyDeleted())
    setSelectedCategories(new Set())
    setSelectedLinks(new Set())
    flash('已恢复到上次保存的内容')
  }

  const closeAdmin = () => {
    if (dirty && !window.confirm('还有未保存的修改，确定离开后台吗？')) return
    onClose()
  }

  const saveGroupDraft = () => {
    if (!editingGroup?.name.trim()) return setError('大分类名称不能为空。')
    const value = { ...editingGroup, name: editingGroup.name.trim() }
    updateGroups(draft.groups.some((item) => item.id === value.id)
      ? draft.groups.map((item) => item.id === value.id ? value : item)
      : [...draft.groups, value])
    setEditingGroup(null)
    flash('大分类已加入待保存修改')
  }

  const saveCategoryDraft = () => {
    if (!editingCategory?.name.trim() || !editingCategory.group_id) return setError('分类名称和所属大分类不能为空。')
    const value = { ...editingCategory, name: editingCategory.name.trim() }
    updateCategories(draft.categories.some((item) => item.id === value.id)
      ? draft.categories.map((item) => item.id === value.id ? value : item)
      : [...draft.categories, value])
    setEditingCategory(null)
    flash('小分类已加入待保存修改')
  }

  const editingLinkDuplicate = useMemo(() => {
    if (!editingLink?.url) return undefined
    const key = normalizeUrl(editingLink.url)
    return links.find((link) => link.id !== editingLink.id && normalizeUrl(link.url) === key)
  }, [editingLink, links])

  const saveLinkDraft = () => {
    if (!editingLink?.name.trim() || !editingLink.url.trim()) return setError('名称和网址不能为空。')
    try {
      const url = new URL(editingLink.url.trim())
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      return setError('请输入包含 http:// 或 https:// 的完整网址。')
    }
    const existing = draft.links.find((item) => item.id === editingLink.id)
    const urlChanged = existing && normalizeUrl(existing.url) !== normalizeUrl(editingLink.url)
    const value: NavLink = {
      ...editingLink,
      name: editingLink.name.trim(),
      url: editingLink.url.trim(),
      ...(urlChanged ? { health_status: 'unchecked', http_status: null, last_checked_at: null, final_url: '', health_error: '' } : {}),
    }
    updateLinks(draft.links.some((item) => item.id === value.id)
      ? draft.links.map((item) => item.id === value.id ? value : item)
      : [...draft.links, value])
    setEditingLink(null)
    flash(editingLinkDuplicate ? '链接已保留，重复网址已标记' : '链接已加入待保存修改')
  }

  const togglePin = (kind: DragItem['kind'], id: string) => {
    if (kind === 'group') updateGroups(draft.groups.map((item) => item.id === id ? { ...item, is_pinned: !item.is_pinned } : item))
    if (kind === 'category') updateCategories(draft.categories.map((item) => item.id === id ? { ...item, is_pinned: !item.is_pinned } : item))
    if (kind === 'link') updateLinks(draft.links.map((item) => item.id === id ? { ...item, is_pinned: !item.is_pinned } : item))
  }

  const dropOn = (target: DragItem) => {
    if (!dragging || dragging.kind !== target.kind || dragging.id === target.id) return setDragging(null)
    if (target.kind === 'group') {
      const ordered = [...groups]
      const sourceIndex = ordered.findIndex((item) => item.id === dragging.id)
      const targetIndex = ordered.findIndex((item) => item.id === target.id)
      const [moved] = ordered.splice(sourceIndex, 1)
      ordered.splice(targetIndex, 0, moved)
      updateGroups(compactOrder(ordered))
    }
    if (target.kind === 'category') {
      const moved = categories.find((item) => item.id === dragging.id)
      const targetItem = categories.find((item) => item.id === target.id)
      if (moved && targetItem) {
        const without = categories.filter((item) => item.id !== moved.id)
        const targetIndex = without.findIndex((item) => item.id === targetItem.id)
        without.splice(targetIndex, 0, { ...moved, group_id: targetItem.group_id })
        const next = without.map((item) => ({
          ...item,
          order_index: without.filter((peer) => peer.group_id === item.group_id).findIndex((peer) => peer.id === item.id),
        }))
        updateCategories(next)
      }
    }
    if (target.kind === 'link') {
      const moved = links.find((item) => item.id === dragging.id)
      const targetItem = links.find((item) => item.id === target.id)
      if (moved && targetItem) {
        const without = links.filter((item) => item.id !== moved.id)
        const targetIndex = without.findIndex((item) => item.id === targetItem.id)
        without.splice(targetIndex, 0, { ...moved, category_id: targetItem.category_id })
        const next = without.map((item) => ({
          ...item,
          order_index: without.filter((peer) => peer.category_id === item.category_id).findIndex((peer) => peer.id === item.id),
        }))
        updateLinks(next)
      }
    }
    setDragging(null)
  }

  const deleteGroup = (group: CategoryGroup) => {
    if (categories.some((category) => category.group_id === group.id)) return setError('请先移动或删除该大分类下的小分类。')
    if (!window.confirm(`删除大分类“${group.name}”？修改会在点击保存后生效。`)) return
    updateGroups(draft.groups.filter((item) => item.id !== group.id))
    markDeleted('groupIds', [group.id], originalGroupIds)
  }

  const deleteCategories = (ids: string[]) => {
    if (!ids.length || !window.confirm(`删除选中的 ${ids.length} 个小分类及其链接？修改会在点击保存后生效。`)) return
    const idSet = new Set(ids)
    const linkIds = draft.links.filter((link) => idSet.has(link.category_id)).map((link) => link.id)
    updateCategories(draft.categories.filter((item) => !idSet.has(item.id)))
    updateLinks(draft.links.filter((item) => !idSet.has(item.category_id)))
    markDeleted('categoryIds', ids, originalCategoryIds)
    markDeleted('linkIds', linkIds, originalLinkIds)
    setSelectedCategories(new Set())
  }

  const deleteLinks = (ids: string[]) => {
    if (!ids.length || !window.confirm(`删除选中的 ${ids.length} 个链接？修改会在点击保存后生效。`)) return
    const idSet = new Set(ids)
    updateLinks(draft.links.filter((item) => !idSet.has(item.id)))
    markDeleted('linkIds', ids, originalLinkIds)
    setSelectedLinks(new Set())
  }

  const bulkCategoryVisibility = (visible: boolean) => {
    updateCategories(draft.categories.map((item) => selectedCategories.has(item.id) ? { ...item, is_visible: visible } : item))
  }
  const bulkLinkVisibility = (visible: boolean) => {
    updateLinks(draft.links.map((item) => selectedLinks.has(item.id) ? { ...item, is_visible: visible } : item))
  }
  const bulkMoveCategories = () => {
    if (!moveCategoryTarget) return
    const start = categories.filter((item) => item.group_id === moveCategoryTarget && !selectedCategories.has(item.id)).length
    let offset = 0
    updateCategories(draft.categories.map((item) => selectedCategories.has(item.id)
      ? { ...item, group_id: moveCategoryTarget, order_index: start + offset++ }
      : item))
    setSelectedCategories(new Set())
  }
  const bulkMoveLinks = () => {
    if (!moveLinkTarget) return
    const start = links.filter((item) => item.category_id === moveLinkTarget && !selectedLinks.has(item.id)).length
    let offset = 0
    updateLinks(draft.links.map((item) => selectedLinks.has(item.id)
      ? { ...item, category_id: moveLinkTarget, order_index: start + offset++ }
      : item))
    setSelectedLinks(new Set())
  }

  const toggleSelection = (kind: 'category' | 'link', id: string) => {
    const current = kind === 'category' ? selectedCategories : selectedLinks
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    if (kind === 'category') setSelectedCategories(next); else setSelectedLinks(next)
  }

  const checkLinks = async () => {
    const targets = selectedLinks.size ? links.filter((item) => selectedLinks.has(item.id)) : filteredLinks
    if (!targets.length) return setError('当前没有可检测的链接。')
    if (!cloudMode) return setError('链接检测需要在已部署并登录的云端后台运行。')
    setChecking(true)
    setError('')
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      if (!token) throw new Error('登录状态已失效，请重新登录。')
      const results: Array<Partial<NavLink> & { id: string }> = []
      for (let index = 0; index < targets.length; index += 50) {
        const response = await fetch('/api/check-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ links: targets.slice(index, index + 50).map(({ id, url }) => ({ id, url })) }),
        })
        const payload = await response.json() as { results?: Array<Partial<NavLink> & { id: string }>; error?: string }
        if (!response.ok || !payload.results) throw new Error(payload.error || '链接检测服务暂不可用。')
        results.push(...payload.results)
      }
      const resultMap = new Map(results.map((item) => [item.id, item]))
      updateLinks(draft.links.map((item) => ({ ...item, ...(resultMap.get(item.id) ?? {}) })))
      flash(`已检测 ${results.length} 个链接，结果等待统一保存`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '链接检测失败。')
    } finally {
      setChecking(false)
    }
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `hjcm-navigation-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    flash('当前草稿已导出')
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as NavigationData
      if (!Array.isArray(parsed.groups) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.links) || !parsed.settings) {
        throw new Error('备份格式不正确或版本过旧。')
      }
      setDraft(parsed)
      flash('备份已载入草稿，点击保存后写入数据库')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取该文件。')
    }
  }

  const importSeed = () => {
    if (!window.confirm('把初始内容载入草稿？点击统一保存前不会覆盖数据库。')) return
    setDraft(clone(seedData))
    flash('初始内容已载入草稿')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span>{draft.settings.logo_text}</span><div><strong>导航管理台</strong><small>CONTENT STUDIO</small></div></div>
        <nav>
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><LayoutDashboard size={18} />概览</button>
          <button className={tab === 'links' ? 'active' : ''} onClick={() => setTab('links')}><Link2 size={18} />链接管理</button>
          <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}><FolderKanban size={18} />分类管理</button>
          <button className={tab === 'appearance' ? 'active' : ''} onClick={() => setTab('appearance')}><Settings size={18} />站点设置</button>
          <button className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}><FileJson size={18} />数据与备份</button>
        </nav>
        <div className="admin-account"><span className={`status-dot ${cloudMode ? 'cloud' : ''}`} /><div><strong>{cloudMode ? '云端数据库' : '本地演示模式'}</strong><small>{userEmail || '数据仅保存在当前浏览器'}</small></div>{cloudMode && <button type="button" onClick={onSignOut} title="退出登录"><LogOut size={16} /></button>}</div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><span className="admin-kicker">HJCM / ADMIN</span><h1>{({ overview: '内容概览', links: '链接管理', categories: '分类管理', appearance: '站点设置', data: '数据与备份' } as const)[tab]}</h1></div>
          <div className="admin-save-actions">
            <span className={`draft-state ${dirty ? 'dirty' : ''}`}>{dirty ? '有未保存修改' : '全部已保存'}</span>
            <button type="button" disabled={!dirty || busy} onClick={discardAll} title="放弃修改"><RotateCcw size={16} /></button>
            <button className="save-all-button" type="button" disabled={!dirty || busy} onClick={() => void saveAll()}><Save size={16} />{busy ? '保存中…' : '保存全部'}</button>
            <button className="preview-button" type="button" onClick={closeAdmin}><ArrowLeft size={17} /> 返回网站</button>
          </div>
        </header>

        {notice && <div className="toast success"><Check size={17} />{notice}</div>}
        {error && <div className="toast error"><X size={17} />{error}<button onClick={() => setError('')}><X size={14} /></button></div>}

        {tab === 'overview' && <Overview draft={draft} cloudMode={cloudMode} categoryMap={categoryMap} onTab={setTab} onNewLink={() => { setTab('links'); setEditingLink(newLink(categories[0]?.id || '', links.length)) }} onNewCategory={() => { setTab('categories'); setEditingCategory(newCategory(groups[0]?.id || '', categories.length)) }} />}

        {tab === 'categories' && (
          <div className="admin-page category-management">
            <div className="management-toolbar">
              <label><Search size={17} /><input placeholder="搜索大小分类…" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} /></label>
              <select value={categoryGroupFilter} onChange={(event) => setCategoryGroupFilter(event.target.value)}><option value="all">全部大分类</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
              <select value={categoryVisibility} onChange={(event) => setCategoryVisibility(event.target.value as VisibilityFilter)}><option value="all">全部状态</option><option value="visible">仅显示</option><option value="hidden">仅隐藏</option></select>
              <button onClick={() => setEditingGroup(newGroup(groups.length))}><Layers3 size={17} /> 新建大分类</button>
              <button className="primary-button" onClick={() => setEditingCategory(newCategory(groups[0]?.id || '', categories.length))}><Plus size={17} /> 新建小分类</button>
            </div>

            <section className="category-block">
              <header><div><span>PARENT CATEGORIES</span><h2>大分类</h2></div><small>拖动把手排序；图钉可置顶</small></header>
              <div className="data-table category-table">
                <div className="table-head"><span>大分类</span><span>小分类数</span><span>状态</span><span>排序</span><span>操作</span></div>
                {groups.filter((group) => !categorySearch.trim() || group.name.toLowerCase().includes(categorySearch.trim().toLowerCase())).map((group) => (
                  <div className={`table-row draggable-row ${dragging?.id === group.id ? 'is-dragging' : ''}`} key={group.id} draggable onDragStart={() => setDragging({ kind: 'group', id: group.id })} onDragEnd={() => setDragging(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn({ kind: 'group', id: group.id })}>
                    <span className="category-cell"><GripVertical className="drag-handle" size={17} /><span><strong>{group.name}</strong><small>独立大分类记录</small></span></span>
                    <span>{categories.filter((category) => category.group_id === group.id).length}</span>
                    <button className={`status-pill ${group.is_visible ? 'visible' : ''}`} onClick={() => updateGroups(draft.groups.map((item) => item.id === group.id ? { ...item, is_visible: !item.is_visible } : item))}>{group.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}{group.is_visible ? '显示' : '隐藏'}</button>
                    <span className="order-actions"><button className={group.is_pinned ? 'pinned' : ''} onClick={() => togglePin('group', group.id)} title="置顶"><Pin size={15} /></button></span>
                    <span className="row-actions"><button onClick={() => setEditingGroup({ ...group })}><Pencil size={15} /></button><button className="danger" onClick={() => deleteGroup(group)}><Trash2 size={15} /></button></span>
                  </div>
                ))}
              </div>
            </section>

            <section className="category-block">
              <header><div><span>CHILD CATEGORIES</span><h2>小分类</h2></div><small>可跨大分类拖动，也可批量移动</small></header>
              {selectedCategories.size > 0 && <BulkBar count={selectedCategories.size} onShow={() => bulkCategoryVisibility(true)} onHide={() => bulkCategoryVisibility(false)} onDelete={() => deleteCategories([...selectedCategories])}><select value={moveCategoryTarget} onChange={(event) => setMoveCategoryTarget(event.target.value)}><option value="">移动到大分类…</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><button disabled={!moveCategoryTarget} onClick={bulkMoveCategories}>确认移动</button></BulkBar>}
              <div className="data-table category-table selectable-table">
                <div className="table-head"><span>小分类</span><span>链接数</span><span>状态</span><span>排序</span><span>操作</span></div>
                {filteredCategories.map((category) => (
                  <div className={`table-row draggable-row ${dragging?.id === category.id ? 'is-dragging' : ''}`} key={category.id} draggable onDragStart={() => setDragging({ kind: 'category', id: category.id })} onDragEnd={() => setDragging(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn({ kind: 'category', id: category.id })}>
                    <span className="category-cell"><button className="selection-button" onClick={() => toggleSelection('category', category.id)}>{selectedCategories.has(category.id) ? <CheckSquare size={17} /> : <Square size={17} />}</button><GripVertical className="drag-handle" size={17} /><span><strong>{category.name}</strong><small>{groupMap.get(category.group_id) ?? '未分组'}</small></span></span>
                    <span>{links.filter((link) => link.category_id === category.id).length}</span>
                    <button className={`status-pill ${category.is_visible ? 'visible' : ''}`} onClick={() => updateCategories(draft.categories.map((item) => item.id === category.id ? { ...item, is_visible: !item.is_visible } : item))}>{category.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}{category.is_visible ? '显示' : '隐藏'}</button>
                    <span className="order-actions"><button className={category.is_pinned ? 'pinned' : ''} onClick={() => togglePin('category', category.id)} title="置顶"><Pin size={15} /></button></span>
                    <span className="row-actions"><button onClick={() => setEditingCategory({ ...category })}><Pencil size={15} /></button><button className="danger" onClick={() => deleteCategories([category.id])}><Trash2 size={15} /></button></span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'links' && (
          <div className="admin-page">
            <div className="management-toolbar link-management-toolbar">
              <label><Search size={17} /><input placeholder="搜索名称、网址、标签…" value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} /></label>
              <select value={linkCategory} onChange={(event) => setLinkCategory(event.target.value)}><option value="all">全部分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <select value={linkVisibility} onChange={(event) => setLinkVisibility(event.target.value as VisibilityFilter)}><option value="all">全部显示状态</option><option value="visible">仅显示</option><option value="hidden">仅隐藏</option></select>
              <select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value as HealthFilter)}><option value="all">全部检测状态</option><option value="unchecked">未检测</option><option value="healthy">正常</option><option value="redirected">已跳转</option><option value="broken">异常</option><option value="duplicate">重复网址</option></select>
              <button onClick={() => void checkLinks()} disabled={checking}><RefreshCw className={checking ? 'spin' : ''} size={17} /> {selectedLinks.size ? `检测所选 ${selectedLinks.size} 项` : '检测当前结果'}</button>
              <button className="primary-button" onClick={() => setEditingLink(newLink(categories[0]?.id || '', links.length))}><Plus size={17} /> 新建链接</button>
            </div>
            {duplicateIds.size > 0 && <div className="duplicate-summary"><AlertTriangle size={16} />发现 {duplicateIds.size} 条重复网址，可通过“重复网址”筛选后处理。</div>}
            {selectedLinks.size > 0 && <BulkBar count={selectedLinks.size} onShow={() => bulkLinkVisibility(true)} onHide={() => bulkLinkVisibility(false)} onDelete={() => deleteLinks([...selectedLinks])}><select value={moveLinkTarget} onChange={(event) => setMoveLinkTarget(event.target.value)}><option value="">移动到小分类…</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button disabled={!moveLinkTarget} onClick={bulkMoveLinks}>确认移动</button></BulkBar>}
            <section className="data-table link-table extended-link-table">
              <div className="table-head"><span>网站</span><span>分类</span><span>检测状态</span><span>排序</span><span>操作</span></div>
              {filteredLinks.map((link) => (
                <div className={`table-row draggable-row ${dragging?.id === link.id ? 'is-dragging' : ''}`} key={link.id} draggable onDragStart={() => setDragging({ kind: 'link', id: link.id })} onDragEnd={() => setDragging(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn({ kind: 'link', id: link.id })}>
                  <span className="link-cell"><button className="selection-button" onClick={() => toggleSelection('link', link.id)}>{selectedLinks.has(link.id) ? <CheckSquare size={17} /> : <Square size={17} />}</button><GripVertical className="drag-handle" size={17} /><span><strong>{link.name}{link.is_featured && <em>推荐</em>}{duplicateIds.has(link.id) && <em className="duplicate-tag">重复</em>}</strong><small>{link.url}</small></span></span>
                  <span><strong className="table-category-name">{categoryMap.get(link.category_id) || '未分类'}</strong><button className={`status-pill inline-status ${link.is_visible ? 'visible' : ''}`} onClick={() => updateLinks(draft.links.map((item) => item.id === link.id ? { ...item, is_visible: !item.is_visible } : item))}>{link.is_visible ? <Eye size={13} /> : <EyeOff size={13} />}{link.is_visible ? '显示' : '隐藏'}</button></span>
                  <HealthBadge link={link} />
                  <span className="order-actions"><button className={link.is_pinned ? 'pinned' : ''} onClick={() => togglePin('link', link.id)} title="置顶"><Pin size={15} /></button></span>
                  <span className="row-actions"><button onClick={() => setEditingLink({ ...link })}><Pencil size={15} /></button><button className="danger" onClick={() => deleteLinks([link.id])}><Trash2 size={15} /></button></span>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'appearance' && <SettingsForm settings={draft.settings} onChange={(settings) => setDraft((current) => ({ ...current, settings }))} />}

        {tab === 'data' && <div className="admin-page data-page"><section className="admin-card data-card"><span className="data-icon"><Download size={22} /></span><div><h2>导出当前草稿</h2><p>下载大分类、小分类、链接状态和站点设置的完整 JSON。</p></div><button onClick={exportData}>导出 JSON</button></section><section className="admin-card data-card"><span className="data-icon"><Upload size={22} /></span><div><h2>从新版备份导入</h2><p>先载入草稿，确认无误后再点击顶部“保存全部”。</p></div><button onClick={() => importRef.current?.click()}>选择文件</button><input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => void importFile(event.target.files?.[0])} /></section><section className="admin-card data-card"><span className="data-icon"><FileJson size={22} /></span><div><h2>载入初始内容</h2><p>恢复从 WebStack-Hugo 迁移出的分类和链接。</p></div><button onClick={importSeed}>载入草稿</button></section>{!cloudMode && <div className="mode-notice"><strong>当前是本地演示模式</strong><p>所有修改仅保存在当前浏览器；链接检测只在云端后台可用。</p></div>}</div>}
      </main>

      {editingGroup && <Editor title={draft.groups.some((item) => item.id === editingGroup.id) ? '编辑大分类' : '新建大分类'} eyebrow="PARENT CATEGORY" busy={busy} onClose={() => setEditingGroup(null)} onSave={saveGroupDraft}><label><span>大分类名称</span><input autoFocus value={editingGroup.name} onChange={(event) => setEditingGroup({ ...editingGroup, name: event.target.value })} placeholder="例如：设计" /></label><label className="switch-field"><input type="checkbox" checked={editingGroup.is_visible} onChange={(event) => setEditingGroup({ ...editingGroup, is_visible: event.target.checked })} /><span>在公开页面显示</span></label></Editor>}

      {editingCategory && <Editor title={draft.categories.some((item) => item.id === editingCategory.id) ? '编辑小分类' : '新建小分类'} eyebrow="CHILD CATEGORY" busy={busy} onClose={() => setEditingCategory(null)} onSave={saveCategoryDraft}><label><span>小分类名称</span><input autoFocus value={editingCategory.name} onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })} placeholder="例如：AI 工具" /></label><label><span>所属大分类</span><select value={editingCategory.group_id} onChange={(event) => setEditingCategory({ ...editingCategory, group_id: event.target.value })}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label className="switch-field"><input type="checkbox" checked={editingCategory.is_visible} onChange={(event) => setEditingCategory({ ...editingCategory, is_visible: event.target.checked })} /><span>在公开页面显示</span></label></Editor>}

      {editingLink && <Editor title={draft.links.some((item) => item.id === editingLink.id) ? '编辑链接' : '添加链接'} eyebrow="WEBSITE" busy={busy} wide onClose={() => setEditingLink(null)} onSave={saveLinkDraft}><div className="two-column editor-field-grid"><label><span>网站名称</span><input autoFocus value={editingLink.name} onChange={(event) => setEditingLink({ ...editingLink, name: event.target.value })} placeholder="网站名称" /></label><label><span>所属分类</span><select value={editingLink.category_id} onChange={(event) => setEditingLink({ ...editingLink, category_id: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="wide"><span>完整网址</span><input value={editingLink.url} onChange={(event) => setEditingLink({ ...editingLink, url: event.target.value })} placeholder="https://example.com" /></label>{editingLinkDuplicate && <div className="field-warning wide"><AlertTriangle size={15} />与“{editingLinkDuplicate.name}”使用相同网址，保存后会标记为重复。</div>}<label className="wide"><span>一句话描述</span><input value={editingLink.description} onChange={(event) => setEditingLink({ ...editingLink, description: event.target.value })} /></label><label><span>卡片强调色</span><input type="color" value={editingLink.accent} onChange={(event) => setEditingLink({ ...editingLink, accent: event.target.value })} /></label><label><span>标签（逗号分隔）</span><input value={editingLink.tags.join(', ')} onChange={(event) => setEditingLink({ ...editingLink, tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label><label className="switch-field"><input type="checkbox" checked={editingLink.is_visible} onChange={(event) => setEditingLink({ ...editingLink, is_visible: event.target.checked })} /><span>公开显示</span></label><label className="switch-field"><input type="checkbox" checked={editingLink.is_featured} onChange={(event) => setEditingLink({ ...editingLink, is_featured: event.target.checked })} /><span>首页推荐</span></label></div></Editor>}
    </div>
  )
}

function Overview({ draft, cloudMode, categoryMap, onTab, onNewLink, onNewCategory }: { draft: NavigationData; cloudMode: boolean; categoryMap: Map<string, string>; onTab: (tab: Tab) => void; onNewLink: () => void; onNewCategory: () => void }) {
  const broken = draft.links.filter((item) => item.health_status === 'broken').length
  return <div className="admin-page"><div className="metric-grid"><article><span>链接总数</span><strong>{draft.links.length}</strong><small>{draft.links.filter((item) => item.is_visible).length} 个公开显示</small></article><article><span>分类结构</span><strong>{draft.groups.length} / {draft.categories.length}</strong><small>大分类 / 小分类</small></article><article><span>链接异常</span><strong>{broken}</strong><small>{draft.links.filter((item) => item.health_status === 'unchecked').length} 个尚未检测</small></article><article><span>数据模式</span><strong className="metric-word">{cloudMode ? '云端' : '本地'}</strong><small>{cloudMode ? '支持事务批量保存' : '适合预览与设计'}</small></article></div><div className="admin-grid-two"><section className="admin-card"><header><div><span>快速操作</span><h2>继续完善你的导航</h2></div></header><div className="quick-actions"><button onClick={onNewLink}><Plus size={18} /><span><strong>添加链接</strong><small>录入一个新网站</small></span></button><button onClick={onNewCategory}><FolderKanban size={18} /><span><strong>添加小分类</strong><small>整理内容结构</small></span></button><button onClick={() => onTab('links')}><Activity size={18} /><span><strong>检查链接</strong><small>发现跳转和失效网址</small></span></button></div></section><section className="admin-card"><header><div><span>最近内容</span><h2>当前推荐链接</h2></div><button onClick={() => onTab('links')}>查看全部</button></header><div className="compact-list">{draft.links.filter((item) => item.is_featured).slice(0, 5).map((link) => <div key={link.id}><span style={{ background: link.accent }}>{link.name.slice(0, 1)}</span><div><strong>{link.name}</strong><small>{categoryMap.get(link.category_id)}</small></div><a href={link.url} target="_blank" rel="noreferrer">访问</a></div>)}</div></section></div></div>
}

function BulkBar({ count, onShow, onHide, onDelete, children }: { count: number; onShow: () => void; onHide: () => void; onDelete: () => void; children: React.ReactNode }) {
  return <div className="bulk-bar"><strong>已选 {count} 项</strong><span>{children}</span><button onClick={onShow}><Eye size={14} /> 显示</button><button onClick={onHide}><EyeOff size={14} /> 隐藏</button><button className="danger" onClick={onDelete}><Trash2 size={14} /> 删除</button></div>
}

function HealthBadge({ link }: { link: NavLink }) {
  const copy: Record<LinkHealthStatus, string> = { unchecked: '未检测', healthy: '正常', redirected: '已跳转', broken: '异常' }
  return <span className={`health-cell ${link.health_status}`} title={link.health_error || link.final_url || ''}><span><i />{copy[link.health_status]}{link.http_status ? ` · ${link.http_status}` : ''}</span><small>{formatCheckedAt(link.last_checked_at)}</small></span>
}

function Editor({ title, eyebrow, busy, wide, onClose, onSave, children }: { title: string; eyebrow: string; busy: boolean; wide?: boolean; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return <div className="editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`editor-panel ${wide ? 'link-editor' : ''}`}><header><div><span>{eyebrow}</span><h2>{title}</h2></div><button onClick={onClose}><X /></button></header><div className="editor-fields">{children}</div><footer><button onClick={onClose}>取消</button><button className="primary-button" disabled={busy} onClick={onSave}>加入待保存修改</button></footer></section></div>
}

function SettingsForm({ settings, onChange }: { settings: SiteSettings; onChange: (settings: SiteSettings) => void }) {
  return <div className="admin-page settings-page"><section className="settings-form admin-card"><header><div><span>公开页面</span><h2>品牌与文案</h2></div><small>修改会随顶部“保存全部”统一提交</small></header><div className="editor-fields two-column"><label><span>站点名称</span><input value={settings.title} onChange={(event) => onChange({ ...settings, title: event.target.value })} /></label><label><span>Logo 文字</span><input maxLength={3} value={settings.logo_text} onChange={(event) => onChange({ ...settings, logo_text: event.target.value })} /></label><label className="wide"><span>首页介绍</span><textarea rows={3} value={settings.subtitle} onChange={(event) => onChange({ ...settings, subtitle: event.target.value })} /></label><label className="wide"><span>顶部公告</span><input value={settings.announcement} onChange={(event) => onChange({ ...settings, announcement: event.target.value })} /></label><label className="wide"><span>页脚文字</span><input value={settings.footer} onChange={(event) => onChange({ ...settings, footer: event.target.value })} /></label><label><span>品牌主色</span><div className="color-input"><input type="color" value={settings.accent} onChange={(event) => onChange({ ...settings, accent: event.target.value })} /><code>{settings.accent}</code></div></label></div></section><section className="settings-preview" style={{ '--preview-accent': settings.accent } as React.CSSProperties}><span>实时预览</span><div className="preview-logo">{settings.logo_text}</div><small>{settings.announcement}</small><h2>{settings.title}</h2><p>{settings.subtitle}</p></section></div>
}
