-- Store Facebook PSID on customer record so future orders can send Messenger notifications
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fb_psid text;
