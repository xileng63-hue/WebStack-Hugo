import { useEffect, useState } from 'react'
import { ArrowLeft, KeyRound, LoaderCircle, LockKeyhole } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { AdminPanel } from './components/AdminPanel'
import { PublicSite } from './components/PublicSite'
import { seedData } from './data/seed'
import { repository } from './lib/repository'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { NavigationData } from './types'
import './App.css'

type Screen = 'site' | 'login' | 'password' | 'admin'

const isPasswordSetupLink = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const authType = hash.get('type') ?? query.get('type')
  return authType === 'invite' || authType === 'recovery'
}

function App() {
  const [data, setData] = useState<NavigationData>(seedData)
  const [screen, setScreen] = useState<Screen>(() => isPasswordSetupLink() ? 'password' : 'site')
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    repository.load()
      .then((loaded) => active && setData(loaded))
      .catch((error: unknown) => active && setLoadError(error instanceof Error ? error.message : '数据加载失败'))
      .finally(() => active && setLoading(false))

    if (!supabase) return () => { active = false }

    void supabase.auth.getSession().then(({ data: authData }) => {
      if (active) setSession(authData.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY' || isPasswordSetupLink()) setScreen('password')
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const openAdmin = () => {
    if (!isSupabaseConfigured || session) setScreen('admin')
    else setScreen('login')
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    setScreen('site')
  }

  if (loading) {
    return <div className="loading-screen"><span className="loading-mark">HJ</span><LoaderCircle className="spin" /><p>正在整理导航内容…</p></div>
  }

  if (screen === 'login') {
    return <LoginScreen onBack={() => setScreen('site')} onSuccess={() => setScreen('admin')} />
  }

  if (screen === 'password') {
    return <PasswordSetupScreen session={session} onSuccess={() => setScreen('admin')} />
  }

  if (screen === 'admin') {
    return (
      <AdminPanel
        data={data}
        setData={setData}
        cloudMode={isSupabaseConfigured}
        userEmail={session?.user.email}
        onClose={() => setScreen('site')}
        onSignOut={signOut}
      />
    )
  }

  return (
    <>
      {loadError && <div className="load-warning">云端数据读取失败，当前展示初始内容：{loadError}</div>}
      <PublicSite data={data} onOpenAdmin={openAdmin} />
    </>
  )
}

function PasswordSetupScreen({ session, onSuccess }: { session: Session | null; onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    if (!session) return setError('邀请登录状态尚未建立，请重新打开邮件中的邀请链接。')
    if (password.length < 8) return setError('密码至少需要 8 个字符。')
    if (password !== confirmPassword) return setError('两次输入的密码不一致。')

    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) return setError(updateError.message)

    window.history.replaceState({}, '', '/')
    onSuccess()
  }

  return (
    <div className="login-screen">
      <div className="login-decoration"><span>HJ</span><p>SET YOUR<br />PASSWORD.</p></div>
      <form className="login-card" onSubmit={submit}>
        <span className="login-icon"><KeyRound size={22} /></span>
        <small>ADMIN INVITATION</small>
        <h1>设置管理员密码</h1>
        <p>邀请已经验证。设置密码后即可进入网站管理后台。</p>
        <label><span>新密码</span><input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 个字符" /></label>
        <label><span>确认新密码</span><input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入新密码" /></label>
        {error && <div className="login-error">{error}</div>}
        <button className="login-submit" disabled={busy || !session} type="submit">{busy ? <LoaderCircle className="spin" size={18} /> : <KeyRound size={18} />} 设置密码并进入后台</button>
        <div className="login-note">密码仅提交给 Supabase Auth，本站不会以明文保存。</div>
      </form>
    </div>
  )
}

function LoginScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setNotice('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (authError) return setError(authError.message)
    onSuccess()
  }

  const sendPasswordEmail = async () => {
    if (!supabase) return
    if (!email.trim()) return setError('请先填写管理员邮箱。')
    setBusy(true)
    setError('')
    setNotice('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    if (resetError) return setError(resetError.message)
    setNotice('设置密码邮件已发送，请检查收件箱；链接只能使用一次。')
  }

  return (
    <div className="login-screen">
      <button className="login-back" type="button" onClick={onBack}><ArrowLeft size={17} /> 返回网站</button>
      <div className="login-decoration"><span>HJ</span><p>YOUR LINKS.<br />YOUR SPACE.</p></div>
      <form className="login-card" onSubmit={submit}>
        <span className="login-icon"><LockKeyhole size={22} /></span>
        <small>ADMIN ACCESS</small>
        <h1>欢迎回来</h1>
        <p>登录后即可管理分类、链接与网站外观。</p>
        <label><span>管理员邮箱</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label><span>密码</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入密码" /></label>
        {error && <div className="login-error">{error}</div>}
        {notice && <div className="login-notice">{notice}</div>}
        <button className="login-submit" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={18} /> : <KeyRound size={18} />} 登录管理后台</button>
        <button className="login-link" disabled={busy} type="button" onClick={sendPasswordEmail}>没有密码或邀请已过期？发送设置密码邮件</button>
        <div className="login-note">账号由 Supabase Auth 管理；建议关闭公开注册，仅保留管理员账号。</div>
      </form>
    </div>
  )
}

export default App
