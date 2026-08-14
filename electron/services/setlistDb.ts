// Histórico de setlists salvos, armazenado em JSON no diretório de dados do app.

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export type SetlistSongEntry = {
  song: string
  author: string
  slides: { lines: string[] }[]
  source: string
  error?: string
}

export type SavedSetlist = {
  id: string
  eventTitle: string
  songs: { song: string; author: string; lyricsHint?: string }[]
  results: SetlistSongEntry[]
  createdAt: string
}

type DB = {
  setlists: SavedSetlist[]
}

function dbPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'holymusic-setlists.json')
}

function loadDB(): DB {
  try {
    const p = dbPath()
    if (!existsSync(p)) return { setlists: [] }
    const raw = readFileSync(p, 'utf-8')
    return JSON.parse(raw) as DB
  } catch {
    return { setlists: [] }
  }
}

function saveDB(db: DB): void {
  try {
    writeFileSync(dbPath(), JSON.stringify(db, null, 2), 'utf-8')
  } catch (err) {
    console.error('Erro ao salvar setlists:', err)
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function saveSetlist(
  eventTitle: string,
  songs: { song: string; author: string; lyricsHint?: string }[],
  results: SetlistSongEntry[]
): SavedSetlist {
  const db = loadDB()
  const entry: SavedSetlist = {
    id: generateId(),
    eventTitle,
    songs,
    results,
    createdAt: new Date().toISOString()
  }
  db.setlists.unshift(entry)
  // Mantém no máximo 100 setlists
  if (db.setlists.length > 100) db.setlists = db.setlists.slice(0, 100)
  saveDB(db)
  return entry
}

export function listSetlists(): SavedSetlist[] {
  const db = loadDB()
  return db.setlists
}

export function deleteSetlist(id: string): void {
  const db = loadDB()
  db.setlists = db.setlists.filter((s) => s.id !== id)
  saveDB(db)
}
