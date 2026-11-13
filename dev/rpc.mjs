#!/usr/bin/env node
// DEV-ONLY. Call Remote methods of a local `dsh web` the way the web client does, for end-to-end checks.
// It exchanges the launch token printed by `dsh web` for an API cookie (GET /connect), then POSTs
// `{ type: 'client-request', rpcId, method, payload }` to /api/<endpoint>.
//
// Usage: node dev/rpc.mjs <url-with-token> <endpoint> [json-args]
//   e.g. node dev/rpc.mjs 'http://127.0.0.1:4317/?token=…' coordinator/getState
import { randomUUID } from 'node:crypto'

const [urlArg, endpoint, argsJson] = process.argv.slice(2)
if (!urlArg || !endpoint) { console.error('usage: rpc.mjs <url-with-token> <endpoint> [json-args]'); process.exit(2) }
const url = new URL(urlArg)
if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') { console.error('rpc.mjs: local dsh web only'); process.exit(2) }
const token = url.searchParams.get('token')
const base = `${url.protocol}//${url.host}`

const connect = await fetch(`${base}/connect?token=${encodeURIComponent(token)}`, { redirect: 'manual' })
const cookie = (connect.headers.getSetCookie?.() ?? [connect.headers.get('set-cookie')]).filter(Boolean).map(c => c.split(';')[0]).join('; ')
if (!cookie) { console.error(`rpc.mjs: connect failed: HTTP ${connect.status}`); process.exit(1) }

const response = await fetch(`${base}/api/${endpoint}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie, origin: base },
  body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: endpoint, payload: { args: argsJson ? JSON.parse(argsJson) : {} } }),
})
const text = await response.text()
if (!response.ok) { console.error(`HTTP ${response.status}: ${text}`); process.exit(1) }
const body = JSON.parse(text)
console.log(JSON.stringify(body.result ?? body, null, 2))
