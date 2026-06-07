ALTER TABLE public.images ADD COLUMN album_id uuid;
ALTER TABLE public.images ADD COLUMN album_title text;
CREATE INDEX IF NOT EXISTS images_album_id_idx ON public.images(album_id);