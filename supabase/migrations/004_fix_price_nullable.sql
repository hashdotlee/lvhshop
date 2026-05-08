-- Fix: allow price to be NULL (dùng cho yêu cầu tìm mua không biết giá)
ALTER TABLE items ALTER COLUMN price DROP NOT NULL;
