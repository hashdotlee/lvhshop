export interface SavedItem {
  id: string
  url: string
  savedAt: number         // unix ms
  updatedAt: number

  // AI-extracted fields
  title: string
  price: number | null     // VND, null = negotiable
  priceText: string        // raw price text from post
  condition: string        // "mới" | "như mới" | "cũ" | …
  description: string
  category: string
  location: string
  seller: { name: string; url: string } | null
  images: string[]
  tags: string[]
  status: 'available' | 'sold' | 'unknown'

  // raw
  rawText: string
  aiAnalyzed: boolean

  // user additions
  notes: string
  compareSelected: boolean
}

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'none'

export interface Settings {
  aiProvider: AiProvider
  apiKey: string
  // Cloud sync
  cloudSync: boolean
  supabaseUrl: string
  supabaseKey: string
  supabaseTable: string
}

export const DEFAULT_SETTINGS: Settings = {
  aiProvider: 'none',
  apiKey: '',
  cloudSync: false,
  supabaseUrl: '',
  supabaseKey: '',
  supabaseTable: 'fb_saved_items',
}

// Messages between content ↔ background ↔ popup
export type Message =
  | { type: 'SAVE_POST'; payload: PostPayload }
  | { type: 'GET_ITEMS' }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'UPDATE_ITEM'; item: SavedItem }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Settings }
  | { type: 'SYNC_TO_CLOUD' }
  | { type: 'ANALYZE_ITEM'; id: string }

export interface PostPayload {
  text: string
  images: string[]
  url: string
  seller: { name: string; url: string } | null
}

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
