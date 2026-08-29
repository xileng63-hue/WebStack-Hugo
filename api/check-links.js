const MAX_LINKS = 50
const REQUEST_TIMEOUT_MS = 12_000

const isPrivateHost = (hostname) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true
  if (/^(0|10|127)\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host)) return true
  const match = host.match(/^172\.(\d+)\./)
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31)
}

const verifyAdmin = async (authorization) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey || !authorization?.startsWith('Bearer ')) return false
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  })
  return response.ok
}

const checkLink = async ({ id, url }) => {
  const checkedAt = new Date().toISOString()
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
      throw new Error('不允许检测本地或非 HTTP 地址')
    }

    const response = await fetch(parsed.href, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'HJCM-Link-Checker/1.0', Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    await response.body?.cancel()
    const reachable = response.status >= 200 && response.status < 400
    return {
      id,
      health_status: reachable ? (response.redirected ? 'redirected' : 'healthy') : 'broken',
      http_status: response.status,
      last_checked_at: checkedAt,
      final_url: response.url || parsed.href,
      health_error: reachable ? '' : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      id,
      health_status: 'broken',
      http_status: null,
      last_checked_at: checkedAt,
      final_url: '',
      health_error: error instanceof Error ? error.message.slice(0, 180) : '检测失败',
    }
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  if (!await verifyAdmin(request.headers.authorization)) return response.status(401).json({ error: 'Unauthorized' })

  const links = Array.isArray(request.body?.links) ? request.body.links.slice(0, MAX_LINKS) : []
  if (!links.length) return response.status(400).json({ error: '没有可检测的链接' })

  const results = await Promise.all(links.map(checkLink))
  return response.status(200).json({ results })
}
