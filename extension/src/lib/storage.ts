import type { SavedItem, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const ITEMS_KEY = 'fbs_items'
const SETTINGS_KEY = 'fbs_settings'

export async function getItems(): Promise<SavedItem[]> {
  const res = await chrome.storage.local.get(ITEMS_KEY)
  return (res[ITEMS_KEY] as SavedItem[]) ?? []
}

export async function getItem(id: string): Promise<SavedItem | undefined> {
  const items = await getItems()
  return items.find(i => i.id === id)
}

export async function upsertItem(item: SavedItem): Promise<void> {
  const items = await getItems()
  const idx = items.findIndex(i => i.id === item.id)
  if (idx >= 0) {
    items[idx] = item
  } else {
    items.unshift(item)
  }
  await chrome.storage.local.set({ [ITEMS_KEY]: items })
}

export async function deleteItem(id: string): Promise<void> {
  const items = await getItems()
  await chrome.storage.local.set({ [ITEMS_KEY]: items.filter(i => i.id !== id) })
}

export async function clearItems(): Promise<void> {
  await chrome.storage.local.set({ [ITEMS_KEY]: [] })
}

export async function getSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] as Partial<Settings> ?? {}) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
