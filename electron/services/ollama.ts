// Cliente para a API local do Ollama (http://127.0.0.1:11434)
// Usa 127.0.0.1 em vez de localhost para evitar problemas de resolução IPv6 no Electron.
// Usa stream: true para evitar HeadersTimeoutError do undici quando o modelo demora.

const OLLAMA_BASE = process.env['OLLAMA_BASE_URL'] || 'http://127.0.0.1:11434'

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

async function streamChat(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number; format?: 'json' } = {}
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      format: opts.format,
      stream: true,
      options: { temperature: opts.temperature ?? 0.4 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    }),
    signal: withTimeout(600000)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama /api/chat falhou (${res.status}): ${text}`)
  }
  if (!res.body) throw new Error('Ollama retornou resposta sem corpo')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const chunk = JSON.parse(trimmed) as { message?: { content: string }; done?: boolean }
        if (chunk.message?.content) content += chunk.message.content
      } catch {
        // linha parcial, ignora
      }
    }
  }
  return content
}

export async function listModels(): Promise<string[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: withTimeout(15000) })
  if (!res.ok) throw new Error(`Ollama /api/tags retornou ${res.status}`)
  const data = (await res.json()) as { models?: { name: string }[] }
  return (data.models || []).map((m) => m.name)
}

export async function chatJson(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number } = {}
): Promise<string> {
  return streamChat(model, system, user, { ...opts, format: 'json' })
}

export async function chatText(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number } = {}
): Promise<string> {
  return streamChat(model, system, user, opts)
}
