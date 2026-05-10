-- ═══════════════════════════════════════════════════════
-- Cập nhật cover image cho các bài blog — ảnh Unsplash theo chủ đề
-- Chạy trong Supabase SQL Editor (idempotent — chạy lại vẫn an toàn)
-- ═══════════════════════════════════════════════════════

-- Bài 1: Thời Showa — phố đêm Tokyo cổ điển
UPDATE blog_posts
SET cover_image = 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=1200&h=630&fit=crop&auto=format&q=80'
WHERE slug = 'thoi-showa-ky-nguyen-vang-son-nhat-ban';

-- Bài 2: Sony — headphones / thiết bị âm thanh vintage
UPDATE blog_posts
SET cover_image = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=630&fit=crop&auto=format&q=80'
WHERE slug = 'sony-hanh-trinh-de-che-dien-tu-toan-cau';

-- Bài 3: Hướng dẫn sưu tầm — máy ảnh phim vintage
UPDATE blog_posts
SET cover_image = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&h=630&fit=crop&auto=format&q=80'
WHERE slug = 'suu-tam-do-dien-tu-showa-huong-dan-toan-dien';
