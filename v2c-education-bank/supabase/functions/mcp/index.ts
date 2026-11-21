// V2C Education Bank — Model Context Protocol server (Streamable HTTP, stateless JSON responses).
//
// Every tool is CALLER-SCOPED: the request's `Authorization: Bearer <user access token>` is forwarded
// to PostgREST, so Row-Level Security decides what is visible. The service-role key is never used.
//
// Deploy:  supabase functions deploy mcp
// Connect: POST https://<project>.supabase.co/functions/v1/mcp  with the donor's access token.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'v2c-education-bank', version: '1.0.0' }

const TOOLS = [
  {
    name: 'my_item_balances',
    title: 'My item balances',
    description:
      "Returns the caller's confirmed item balances in the V2C Education Bank: for each item type, approved, pending, distributed and available quantities, plus membership status.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'my_recent_deposits',
    title: 'My recent deposits',
    description: "Returns the caller's most recent item deposits with their reference codes and approval states.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10, description: 'How many deposits to return' },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: 'Optional status filter' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
]

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type JsonRpcId = string | number | null
interface JsonRpcRequest { jsonrpc: '2.0'; id?: JsonRpcId; method: string; params?: Record<string, unknown> }

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } })
const rpcResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: '2.0', id, result })
const rpcError = (id: JsonRpcId, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })
const toolText = (data: unknown, isError = false) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  structuredContent: isError ? undefined : { result: data },
  isError,
})

async function callTool(token: string, name: string, args: Record<string, unknown>) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) return toolText({ error: 'Invalid or expired access token' }, true)
  const uid = userData.user.id

  if (name === 'my_item_balances') {
    const [balances, membership] = await Promise.all([
      supabase.from('donor_item_balances')
        .select('slug, name_en, name_ta, approved_quantity, pending_quantity, distributed_quantity, available_quantity')
        .eq('donor_id', uid),
      supabase.from('donor_membership').select('qualifying_quantity, membership_threshold, is_member').eq('donor_id', uid).maybeSingle(),
    ])
    if (balances.error) return toolText({ error: balances.error.message }, true)
    return toolText({
      items: (balances.data ?? []).filter((b) => b.approved_quantity + b.pending_quantity + b.distributed_quantity > 0),
      membership: membership.data,
    })
  }

  if (name === 'my_recent_deposits') {
    const limit = Math.min(50, Math.max(1, Number(args.limit ?? 10) || 10))
    let q = supabase.from('deposits')
      .select('reference_code, quantity, total_amount_lkr, payment_method, status, admin_notes, created_at, reviewed_at, item_types(slug, name_en, name_ta)')
      .eq('donor_id', uid)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (typeof args.status === 'string' && ['pending', 'approved', 'rejected'].includes(args.status)) q = q.eq('status', args.status)
    const { data, error } = await q
    if (error) return toolText({ error: error.message }, true)
    return toolText({ deposits: data })
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(rpcError(null, -32000, 'Method not allowed: use POST'), 405, { Allow: 'POST, OPTIONS' })

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token) {
    return json(rpcError(null, -32001, 'Unauthorized: send the donor access token as a Bearer token'), 401, {
      'WWW-Authenticate': 'Bearer realm="v2c-education-bank"',
    })
  }

  let body: JsonRpcRequest | JsonRpcRequest[]
  try {
    body = await req.json()
  } catch {
    return json(rpcError(null, -32700, 'Parse error'), 400)
  }

  const handle = async (msg: JsonRpcRequest) => {
    const id = msg.id ?? null
    if (msg?.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(id, -32600, 'Invalid Request')
    // Notifications (no id) get no response
    if (msg.id === undefined) return null
    switch (msg.method) {
      case 'initialize':
        return rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: 'Read-only tools for a signed-in V2C Education Bank donor. Balances are item quantities, not money.',
        })
      case 'ping':
        return rpcResult(id, {})
      case 'tools/list':
        return rpcResult(id, { tools: TOOLS })
      case 'tools/call': {
        const name = String(msg.params?.name ?? '')
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>
        const result = await callTool(token, name, args)
        return result ? rpcResult(id, result) : rpcError(id, -32602, `Unknown tool: ${name}`)
      }
      default:
        return rpcError(id, -32601, `Method not found: ${msg.method}`)
    }
  }

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean)
    return out.length ? json(out) : new Response(null, { status: 202, headers: cors })
  }
  const out = await handle(body)
  return out ? json(out) : new Response(null, { status: 202, headers: cors })
})
