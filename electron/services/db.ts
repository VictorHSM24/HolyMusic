// Banco local de letras aprovadas, armazenado em JSON no diretório de dados do app.
// Evita rebuscar/regerar letras que já foram revisadas pelo usuário.

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export type CachedSong = {
  song: string
  author: string
  language: string
  lyrics: string
  slides: { lines: string[] }[]
  source: 'letras.mus.br' | 'llm' | 'manual'
  approved: boolean
  updatedAt: string
}

type DB = {
  songs: Record<string, CachedSong>
}

function dbPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'holymusic-db.json')
}

function loadDB(): DB {
  try {
    const p = dbPath()
    if (!existsSync(p)) return { songs: {} }
    const raw = readFileSync(p, 'utf-8')
    return JSON.parse(raw) as DB
  } catch {
    return { songs: {} }
  }
}

function saveDB(db: DB): void {
  try {
    writeFileSync(dbPath(), JSON.stringify(db, null, 2), 'utf-8')
  } catch (err) {
    console.error('Erro ao salvar banco:', err)
  }
}

function key(song: string, author: string, language: string): string {
  return `${song.toLowerCase().trim()}|${author.toLowerCase().trim()}|${language}`
}

export function getCachedSong(
  song: string,
  author: string,
  language: string
): CachedSong | null {
  const db = loadDB()
  return db.songs[key(song, author, language)] || null
}

export function saveCachedSong(entry: CachedSong): void {
  const db = loadDB()
  db.songs[key(entry.song, entry.author, entry.language)] = {
    ...entry,
    updatedAt: new Date().toISOString()
  }
  saveDB(db)
}

export function listCachedSongs(): CachedSong[] {
  const db = loadDB()
  return Object.values(db.songs).sort((a, b) => a.song.localeCompare(b.song))
}

export function deleteCachedSong(song: string, author: string, language: string): void {
  const db = loadDB()
  delete db.songs[key(song, author, language)]
  saveDB(db)
}
