# Chợ Nhanh 🛒

Nhập đơn hàng bằng ngôn ngữ tự nhiên, AI tự động trích xuất, listing mua/bán, nhắn tin Messenger.

## Stack
- **Frontend + API routes**: Next.js 14 (App Router) → deploy Vercel
- **Database**: Supabase (Postgres)
- **AI**: Anthropic Claude Sonnet

---

## 1. Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → New project
2. Vào **SQL Editor** → paste nội dung file `supabase/migrations/001_items.sql` → Run
3. Vào **Project Settings > API**, copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (giữ bí mật)

---

## 2. Deploy lên Vercel

```bash
# Cài Vercel CLI nếu chưa có
npm i -g vercel

# Deploy
vercel
```

Hoặc kết nối GitHub repo tại [vercel.com/new](https://vercel.com/new).

### Environment Variables (thêm trong Vercel Dashboard > Settings > Environment Variables)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` (service_role key — bí mật) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `ADMIN_PASSWORD` | mật khẩu của bạn |
| `NEXT_PUBLIC_ADMIN_HASH` | `admin-` + mật khẩu (VD: `admin-matkhau123`) |

---

## 3. Sử dụng

- **Người mua**: Truy cập URL bình thường → xem listing, nhắn tin Messenger
- **Admin**: Truy cập `https://yoursite.com/#admin-matkhau123` → nhập mật khẩu → đăng tin

---

## 4. Chạy local

```bash
cp .env.example .env.local
# Điền các giá trị vào .env.local

npm install
npm run dev
# → http://localhost:3000
# → http://localhost:3000/#admin-chorquanh2025
```
