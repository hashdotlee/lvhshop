import type { PostPayload } from '../types'

const PROCESSED_ATTR = 'data-fbs-processed'

// ── Selectors for different FB surfaces ───────────────────────────────────────

// Post text selectors (in priority order)
const TEXT_SELECTORS = [
  '[data-ad-preview="message"]',
  '[data-testid="post_message"]',
  'div[data-ad-comet-preview="message"]',
  '.userContent',
  'div[dir="auto"][style*="text-align"]',
]

// Post action bar selectors (where we inject the Save button)
const ACTION_BAR_SELECTORS = [
  '[aria-label="Like"]',
  '[aria-label="Thích"]',
  '[data-testid="UFI2ActionsBar/action/like"]',
  'div[role="toolbar"]',
]

// Root container selectors for posts
const POST_SELECTORS = [
  'article[role="article"]',
  'div[data-pagelet^="FeedUnit"]',
  'div[data-pagelet="MarketplaceListingPage"]',
  'div[data-ad-comet-preview]',
]

// ── Utilities ─────────────────────────────────────────────────────────────────

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.createElement('div')
  toast.className = `fbs-toast fbs-toast--${type}`
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

function extractText(root: Element): string {
  for (const sel of TEXT_SELECTORS) {
    const el = root.querySelector(sel)
    if (el?.textContent?.trim()) return el.textContent.trim()
  }
  // Fallback: collect text from divs with dir="auto" (FB localized content)
  const parts: string[] = []
  root.querySelectorAll('div[dir="auto"]').forEach(el => {
    const t = el.textContent?.trim()
    if (t && t.length > 5) parts.push(t)
  })
  return parts.join('\n').slice(0, 2000)
}

function extractImages(root: Element): string[] {
  const seen = new Set<string>()
  const images: string[] = []

  root.querySelectorAll<HTMLImageElement>('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src') || ''
    // Filter out avatars, emoji, icons, spacer images
    if (
      src &&
      !seen.has(src) &&
      (src.includes('fbcdn') || src.includes('cdninstagram')) &&
      !src.includes('emoji') &&
      !src.includes('static') &&
      !src.includes('rsrc') &&
      (img.naturalWidth > 60 || img.width > 60 || !img.naturalWidth)
    ) {
      seen.add(src)
      images.push(src)
    }
  })

  return images
}

function extractSeller(root: Element): PostPayload['seller'] {
  // Try structured author link
  const candidates = [
    root.querySelector<HTMLAnchorElement>('h2 a, h3 a, h4 a'),
    root.querySelector<HTMLAnchorElement>('a[href*="/profile/"] strong')?.closest('a'),
    root.querySelector<HTMLAnchorElement>('strong a'),
    root.querySelector<HTMLAnchorElement>('a[href*="facebook.com/"][aria-label]'),
  ]
  for (const el of candidates) {
    if (!el) continue
    const name = el.textContent?.trim() || el.getAttribute('aria-label') || ''
    const href = el.href || ''
    if (name && name.length > 1 && href) return { name, url: href }
  }
  return null
}

function extractPostUrl(root: Element): string {
  // Try to find a permalink
  const linkCandidates = root.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/posts/"], a[href*="story_fbid"], a[href*="/marketplace/item/"], a[href*="?fbid="]',
  )
  for (const a of linkCandidates) {
    if (a.href && a.href.startsWith('https://')) return a.href
  }
  return window.location.href
}

// ── Button injection ───────────────────────────────────────────────────────────

function addSaveButton(post: Element) {
  if (post.getAttribute(PROCESSED_ATTR)) return
  post.setAttribute(PROCESSED_ATTR, '1')

  const wrapper = document.createElement('div')
  wrapper.className = 'fbs-btn-wrapper'

  const btn = document.createElement('button')
  btn.className = 'fbs-save-btn'
  btn.title = 'Lưu bài đăng này (FB Saver)'
  btn.innerHTML = '💾 Lưu'

  btn.addEventListener('click', e => {
    e.preventDefault()
    e.stopPropagation()
    handleSave(post, btn)
  })

  wrapper.appendChild(btn)

  // Find action bar to append into
  let injected = false
  for (const sel of ACTION_BAR_SELECTORS) {
    const likeBtn = post.querySelector(sel)
    if (likeBtn) {
      const bar = likeBtn.closest('[role="toolbar"]') ?? likeBtn.parentElement?.parentElement
      if (bar) {
        bar.appendChild(wrapper)
        injected = true
        break
      }
    }
  }

  if (!injected) {
    // Fallback: append a small bar at the bottom of the post
    const fallback = document.createElement('div')
    fallback.style.cssText = 'padding:8px 12px;border-top:1px solid #e4e6eb;'
    fallback.appendChild(wrapper)
    post.appendChild(fallback)
  }
}

async function handleSave(post: Element, btn: HTMLButtonElement) {
  btn.disabled = true
  btn.innerHTML = '⏳ Đang lưu...'

  const payload: PostPayload = {
    text: extractText(post),
    images: extractImages(post),
    url: extractPostUrl(post),
    seller: extractSeller(post),
  }

  if (!payload.text) {
    btn.innerHTML = '💾 Lưu'
    btn.disabled = false
    showToast('Không tìm thấy nội dung bài đăng.', 'error')
    return
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'SAVE_POST', payload })
    if (response?.success) {
      btn.innerHTML = '✅ Đã lưu'
      btn.classList.add('fbs-save-btn--saved')
      showToast('✅ Đã lưu bài đăng!', 'success')
    } else {
      btn.innerHTML = '❌ Lỗi'
      btn.classList.add('fbs-save-btn--error')
      showToast(`Lỗi: ${response?.error ?? 'Unknown'}`, 'error')
      setTimeout(() => {
        btn.innerHTML = '💾 Lưu'
        btn.className = 'fbs-save-btn'
        btn.disabled = false
      }, 2500)
    }
  } catch (err) {
    btn.innerHTML = '💾 Lưu'
    btn.disabled = false
    showToast('Lỗi kết nối extension.', 'error')
  }
}

// ── Marketplace listing page (single item view) ───────────────────────────────

function injectMarketplaceSaveButton() {
  if (document.querySelector('.fbs-marketplace-bar')) return

  const bar = document.createElement('div')
  bar.className = 'fbs-marketplace-bar'
  bar.style.cssText = 'position:fixed;top:70px;right:16px;z-index:9999;'

  const btn = document.createElement('button')
  btn.className = 'fbs-save-btn'
  btn.innerHTML = '💾 Lưu sản phẩm này'
  btn.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'

  btn.addEventListener('click', e => {
    e.preventDefault()
    handleSave(document.body, btn)
  })

  bar.appendChild(btn)
  document.body.appendChild(bar)
}

// ── Observer for dynamic FB content ───────────────────────────────────────────

function processAll() {
  for (const sel of POST_SELECTORS) {
    document.querySelectorAll<HTMLElement>(`${sel}:not([${PROCESSED_ATTR}])`).forEach(post => {
      addSaveButton(post)
    })
  }
}

const observer = new MutationObserver(() => {
  processAll()
})

// Initial run
processAll()

// Marketplace single listing page
if (window.location.pathname.includes('/marketplace/item/')) {
  injectMarketplaceSaveButton()
}

// Watch for new posts (FB is a SPA)
observer.observe(document.body, { childList: true, subtree: true })
