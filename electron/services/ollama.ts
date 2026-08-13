// Cliente para a API local do Ollama (http://localhost:11434)

const OLLAMA_BASE = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434'

export async function listModels(): Promise<string[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`)
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
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      format: 'json',
      stream: false,
      options: { temperature: opts.temperature ?? 0.4 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama /api/chat falhou (${res.status}): ${text}`)
  }
  const data = (await res.json()) as { message?: { content: string } }
  return data.message?.content || ''
}

export async function chatText(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number } = {}
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: opts.temperature ?? 0.5 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama /api/chat falhou (${res.status}): ${text}`)
  }
  const data = (await res.json()) as { message?: { content: string } }
  return data.message?.content || ''
}
