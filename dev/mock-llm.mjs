#!/usr/bin/env node
// DEV-ONLY. Scripted Messages-API-compatible mock model for development and tests.
// It never contacts a real provider. dsh's DeepSeek API-key route reaches it through DEEPSEEK_BASE_URL.
//
// Usage: node dev/mock-llm.mjs [--port 4319] [--log <file.jsonl>]
//
// Behaviour, decided per request from the request body:
// - Auto-review reviewer requests (system prompt contains REVIEW_POLICY): deny with medium risk when the pending
//   call mentions MOCK_ESCALATE (so auto mode asks the user), otherwise allow with low risk.
// - Agent requests: the newest MOCK_* directive in the pending user input (every user message after the last
//   assistant message, so a runtime reminder appended as the last message does not hide it) decides the reply:
//     MOCK_BASH <command>   call the bash tool with <command> (rest of that line)
//     MOCK_ASK              call ask_user_question with an indefinite wait (timeout -1)
//     MOCK_ASK_TIMED        call ask_user_question with the default timed wait
//     MOCK_SLOW <seconds>   stream text slowly for <seconds> (to steer while running)
//     MOCK_TOOLS            reply with the tool names this request declared
//     MOCK_TOOL <name> <json>  call tool <name> with the JSON object that follows on the same line. The FIRST
//                           MOCK_TOOL in the message wins and takes precedence over the other directives, so a
//                           JSON argument may itself carry directives for the next agent (e.g. a thread brief).
//   Pending input that only carries tool results gets a short closing text reply.
// - The log's `role` is "coordinator" or "lead" (the Lead of an Executor Session), from the role prompt's heading.
//   Anything else gets an echo reply.
// - Every request is appended to the log as one JSON line (kind, tool names, last user text, reply).
import { createServer } from 'node:http'
import { appendFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const port = Number(opt('--port', '4319'))
const logFile = opt('--log', undefined)

const log = (record) => {
  const line = JSON.stringify({ time: new Date().toISOString(), ...record })
  console.log(line)
  if (logFile) appendFileSync(logFile, line + '\n')
}

const textOf = (content) => typeof content === 'string' ? content
  : Array.isArray(content) ? content.map(b => b.type === 'text' ? b.text : b.type === 'tool_result' ? `[tool_result ${textOf(b.content)}]` : '').join('\n') : ''
const systemText = (system) => typeof system === 'string' ? system : Array.isArray(system) ? system.map(b => b.text ?? '').join('\n') : ''

function directive(text) {
  const re = /MOCK_(BASH|ASK_TIMED|ASK|SLOW|TOOLS)\b[ \t]*([^\n]*?)(?=\s*MOCK_(?:BASH|ASK_TIMED|ASK|SLOW|TOOLS)\b|\n|$)/g
  let found
  for (let m; (m = re.exec(text)) !== null;) found = { kind: m[1], arg: m[2].trim() }
  return found
}

function toolDirective(text) {
  const at = text.indexOf('MOCK_TOOL ')
  if (at < 0) return undefined
  const line = text.slice(at + 'MOCK_TOOL '.length).split('\n')[0]
  const m = /^(\S+)\s*(.*)$/.exec(line)
  if (!m) return undefined
  let input = {}
  try { input = m[2].trim() === '' ? {} : JSON.parse(m[2]) } catch (error) { input = { mockParseError: String(error) } }
  return { name: m[1], input }
}

function decide(body) {
  const system = systemText(body.system)
  const messages = body.messages ?? []
  const last = messages.at(-1)
  const lastText = textOf(last?.content)
  const tools = (body.tools ?? []).map(t => t.name)
  if (system.includes('REVIEW_POLICY')) {
    // The review input repeats earlier calls; only the pending call (the last tool-call item) decides.
    const pending = lastText.slice(Math.max(0, lastText.lastIndexOf('"kind": "tool-call"')))
    const escalate = pending.includes('MOCK_ESCALATE')
    return { kind: 'review', tools, lastText,
      text: escalate ? '{"risk":"medium","decision":"deny","reason":"mock reviewer: MOCK_ESCALATE needs the user"}' : '{"risk":"low","decision":"allow"}' }
  }
  if (tools.length === 0) return { kind: 'plain', tools, lastText, text: 'Mock title' }
  // The pending input is every user message after the last assistant message: dsh may append a runtime reminder as
  // its own message after the one that carries the directive.
  const firstPending = messages.findLastIndex(m => m.role === 'assistant') + 1
  const pending = messages.slice(firstPending).filter(m => m.role === 'user')
  const blocks = pending.flatMap(m => (Array.isArray(m.content) ? m.content : typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : []))
  const userTexts = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n')
  const call = toolDirective(userTexts)
  if (call !== undefined) return { kind: 'agent', tools, lastText, tool: call }
  const d = directive(userTexts)
  if (d === undefined && blocks.some(b => b.type === 'tool_result')) {
    return { kind: 'agent', tools, lastText, text: `mock: tool finished: ${textOf(blocks.find(b => b.type === 'tool_result').content).slice(0, 300)}` }
  }
  switch (d?.kind) {
    case 'BASH': return { kind: 'agent', tools, lastText, tool: { name: 'bash', input: { command: d.arg || 'echo hello', description: 'mock command' } } }
    case 'ASK': return { kind: 'agent', tools, lastText, tool: { name: 'ask_user_question', input: { questions: [mockQuestion()], timeout: -1 } } }
    case 'ASK_TIMED': return { kind: 'agent', tools, lastText, tool: { name: 'ask_user_question', input: { questions: [mockQuestion()] } } }
    case 'SLOW': return { kind: 'agent', tools, lastText, text: 'mock: slow reply. '.repeat(Number(d.arg) || 10), delayMs: 1000 }
    case 'TOOLS': return { kind: 'agent', tools, lastText, text: `mock tools (${tools.length}): ${tools.join(', ')}` }
    default: return { kind: 'agent', tools, lastText, text: `mock reply to: ${userTexts.slice(-120)}` }
  }
}

const mockQuestion = () => ({ id: 'q1', header: 'Mock', question: 'Which colour should the mock use?', options: [{ label: 'Red' }, { label: 'Blue' }] })

const sse = (res, payload) => res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`)
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function stream(res, reply, model) {
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' })
  sse(res, { type: 'message_start', message: { id: `mock-${Date.now()}`, type: 'message', role: 'assistant', model, content: [], usage: { input_tokens: 10, output_tokens: 0 } } })
  if (reply.tool) {
    const id = `toolu_mock_${Date.now()}`
    sse(res, { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id, name: reply.tool.name, input: {} } })
    sse(res, { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(reply.tool.input) } })
    sse(res, { type: 'content_block_stop', index: 0 })
    sse(res, { type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 20 } })
  } else {
    sse(res, { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
    const parts = reply.delayMs ? reply.text.split(/(?<=\. )/) : [reply.text]
    for (const part of parts) {
      if (res.destroyed) return
      sse(res, { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: part } })
      if (reply.delayMs) await sleep(reply.delayMs)
    }
    sse(res, { type: 'content_block_stop', index: 0 })
    sse(res, { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 20 } })
  }
  sse(res, { type: 'message_stop' })
  res.end()
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://mock')
  if (req.method === 'GET' && url.pathname.endsWith('/models')) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ data: [{ id: 'mock-model', display_name: 'Mock model', type: 'model' }], has_more: false }))
    return
  }
  if (req.method !== 'POST' || !url.pathname.endsWith('/messages')) {
    res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":{"type":"not_found"}}'); return
  }
  const chunks = []
  for await (const c of req) chunks.push(c)
  let body
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { res.writeHead(400); res.end(); return }
  const reply = decide(body)
  const sys = systemText(body.system)
  // Role headings of prompts/coordinator.md and prompts/thread.md (and the role prompt of earlier releases).
  const role = sys.includes('# Your role: coordinator') ? 'coordinator'
    : sys.includes('# Your role: Lead of an Executor Session') || sys.includes('# Your role: thread lead') ? 'lead' : undefined
  log({ path: url.pathname, model: body.model, stream: body.stream, kind: reply.kind, role, tools: reply.tools,
    lastText: reply.lastText.slice(-4000), reply: reply.tool ?? reply.text?.slice(0, 200), metadata: body.metadata })
  if (body.stream === false) {
    res.writeHead(200, { 'content-type': 'application/json' })
    const content = reply.tool ? [{ type: 'tool_use', id: `toolu_mock_${Date.now()}`, ...reply.tool }] : [{ type: 'text', text: reply.text }]
    res.end(JSON.stringify({ id: 'mock', type: 'message', role: 'assistant', model: body.model, content,
      stop_reason: reply.tool ? 'tool_use' : 'end_turn', usage: { input_tokens: 10, output_tokens: 20 } }))
    return
  }
  await stream(res, reply, body.model)
})
server.listen(port, '127.0.0.1', () => log({ ready: `http://127.0.0.1:${port}/v1` }))
