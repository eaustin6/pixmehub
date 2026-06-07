ALTER TABLE public.images ADD COLUMN IF NOT EXISTS telegram_file_id text;
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS telegram_message_id bigint;
ALTER TABLE public.images ALTER COLUMN storage_path DROP NOT NULL;