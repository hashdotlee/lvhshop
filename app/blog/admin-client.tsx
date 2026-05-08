'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH ?? 'admin-lvh2025'

interface Post {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  cover_image: string | null
  tags: string[]
  published: boolean
  created_at: string
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
}

export default function BlogAdminClient() {
  const [isAdmin, setIsAdmin] = useState(false)
  const adminKey = useRef('')
  const router = useRouter()

  const [showForm, setShowForm] = useState(false)
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [adminPosts, setAdminPosts] = useState<Post[]>([])
  const [saving, setSaving] = useState(false)

  const emptyForm = { title: '', slug: '', excerpt: '', content: '', cover_image: '', tags: '', published: false }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === `#${ADMIN_HASH}`) {
      history.replaceState(null, '', window.location.pathname)
      adminKey.current = ADMIN_HASH
      sessionStorage.setItem('cq_admin', '1')
      sessionStorage.setItem('cq_admin_key', ADMIN_HASH)
      setIsAdmin(true)
    } else if (sessionStorage.getItem('cq_admin')) {
      adminKey.current = sessionStorage.getItem('cq_admin_key') ?? ''
      setIsAdmin(true)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchAdminPosts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function fetchAdminPosts() {
    const r = await fetch('/api/blog', { headers: { 'x-admin-key': adminKey.current } })
    const d = await r.json()
    setAdminPosts(Array.isArray(d) ? d : [])
  }

  function openNew() {
    setEditPost(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(p: Post) {
    setEditPost(p)
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? '',
      content: p.content ?? '',
      cover_image: p.cover_image ?? '',
      tags: p.tags?.join(', ') ?? '',
      published: p.published,
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim() || null,
      cover_image: form.cover_image.trim() || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      published: form.published,
      ...(editPost ? { id: editPost.id } : {}),
    }
    const r = await fetch('/api/blog', {
      method: editPost ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (r.ok) {
      setShowForm(false)
      await fetchAdminPosts()
      router.refresh()
    }
  }

  async function deletePost(id: number) {
    if (!confirm('Xóa bài viết này?')) return
    await fetch(`/api/blog?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey.current },
    })
    await fetchAdminPosts()
    router.refresh()
  }

  async function togglePublish(p: Post) {
    await fetch('/api/blog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify({ id: p.id, published: !p.published }),
    })
    await fetchAdminPosts()
    router.refresh()
  }

  if (!isAdmin) return null

  return (
    <>
      <style>{adminStyles}</style>
      <div className="admin-blog-bar">
        <span className="admin-blog-label">Admin Blog</span>
        <button className="btn-green-sm" onClick={openNew}>+ Bài viết mới</button>
      </div>

      {adminPosts.some(p => !p.published) && (
        <div className="admin-drafts">
          <div className="admin-drafts-title">Bản nháp ({adminPosts.filter(p => !p.published).length})</div>
          {adminPosts.filter(p => !p.published).map(p => (
            <div key={p.id} className="admin-draft-row">
              <span className="admin-draft-title">{p.title}</span>
              <div className="admin-draft-actions">
                <button className="btn-xs" onClick={() => openEdit(p)}>Sửa</button>
                <button className="btn-xs btn-green-xs" onClick={() => togglePublish(p)}>Đăng</button>
                <button className="btn-xs btn-red-xs" onClick={() => deletePost(p.id)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adminPosts.filter(p => p.published).length > 0 && (
        <div className="admin-published">
          <div className="admin-drafts-title">Đã đăng ({adminPosts.filter(p => p.published).length})</div>
          {adminPosts.filter(p => p.published).map(p => (
            <div key={p.id} className="admin-draft-row">
              <span className="admin-draft-title">{p.title}</span>
              <div className="admin-draft-actions">
                <button className="btn-xs" onClick={() => openEdit(p)}>Sửa</button>
                <button className="btn-xs" onClick={() => togglePublish(p)}>Ẩn</button>
                <button className="btn-xs btn-red-xs" onClick={() => deletePost(p.id)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-blog">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>{editPost ? 'Sửa bài viết' : 'Bài viết mới'}</h3>
            <div className="blog-form-grid">
              <div className="fg full">
                <label className="lbl">Tiêu đề <span style={{ color: 'red' }}>*</span></label>
                <input className="inp" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                  placeholder="Tiêu đề bài viết..." />
              </div>
              <div className="fg full">
                <label className="lbl">Slug (URL)</label>
                <input className="inp" value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="ten-bai-viet" />
              </div>
              <div className="fg full">
                <label className="lbl">Mô tả ngắn (excerpt)</label>
                <input className="inp" value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Tóm tắt bài viết..." />
              </div>
              <div className="fg full">
                <label className="lbl">Ảnh bìa (URL)</label>
                <input className="inp" value={form.cover_image}
                  onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))}
                  placeholder="https://..." />
              </div>
              <div className="fg full">
                <label className="lbl">Tags (cách nhau bằng dấu phẩy)</label>
                <input className="inp" value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="mua bán, thủ thuật, kinh nghiệm" />
              </div>
              <div className="fg full">
                <label className="lbl">Nội dung (HTML hoặc plain text)</label>
                <textarea className="inp textarea-content" value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Viết nội dung bài viết tại đây..." rows={12} />
              </div>
              <div className="fg full">
                <label className="check-label">
                  <input type="checkbox" checked={form.published}
                    onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
                  Đăng công khai ngay
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
              <button className="btn-green" onClick={save} disabled={saving || !form.title.trim()}>
                {saving ? 'Đang lưu...' : editPost ? 'Cập nhật' : 'Tạo bài viết'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const adminStyles = `
.admin-blog-bar{display:flex;align-items:center;justify-content:space-between;margin-top:40px;padding:14px 18px;background:#f0efe9;border-radius:10px}
.admin-blog-label{font-size:12px;font-weight:600;color:#8c8982;text-transform:uppercase;letter-spacing:.5px}
.btn-green-sm{background:#2a7a4b;color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:13px;cursor:pointer;font-family:inherit}
.btn-green-sm:hover{background:#22623c}
.admin-drafts,.admin-published{margin-top:16px;border:1px solid #e8e6e1;border-radius:10px;overflow:hidden}
.admin-drafts-title{padding:10px 14px;font-size:11px;font-weight:600;color:#8c8982;text-transform:uppercase;letter-spacing:.5px;background:#f9f8f6;border-bottom:1px solid #e8e6e1}
.admin-draft-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f0efe9;background:#fff}
.admin-draft-row:last-child{border-bottom:none}
.admin-draft-title{font-size:14px;font-weight:500}
.admin-draft-actions{display:flex;gap:6px}
.btn-xs{border:1px solid #e8e6e1;background:#fff;color:#1a1916;border-radius:5px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;transition:background .15s}
.btn-xs:hover{background:#f0efe9}
.btn-green-xs{background:#edf7f2;border-color:#b6dfca;color:#2a7a4b}
.btn-green-xs:hover{background:#d7f0e5}
.btn-red-xs{background:#fdf2f1;border-color:#f5c6c3;color:#c0392b}
.btn-red-xs:hover{background:#fce4e2}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:500;padding:24px}
.modal-blog{background:#fff;border-radius:14px;padding:28px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto}
.blog-form-grid{display:grid;gap:12px}
.fg{display:flex;flex-direction:column;gap:4px}
.full{grid-column:1/-1}
.lbl{font-size:12px;font-weight:500;color:#8c8982}
.inp{width:100%;border:1px solid #e8e6e1;border-radius:8px;padding:8px 12px;font-size:14px;font-family:inherit;outline:none;background:#fff;color:#1a1916;transition:border-color .15s}
.inp:focus{border-color:#1a1916}
.textarea-content{resize:vertical;min-height:200px}
.check-label{display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer}
.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
.btn-ghost{border:1px solid #e8e6e1;background:#fff;color:#1a1916;border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer;font-family:inherit}
.btn-green{background:#2a7a4b;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer;font-family:inherit}
.btn-green:hover{background:#22623c}
.btn-green:disabled{opacity:.5;cursor:default}
`
