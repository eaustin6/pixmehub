
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.images ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.images ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.images ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.images ADD COLUMN hidden_reason text;

CREATE INDEX images_tags_idx ON public.images USING gin (tags);
CREATE INDEX images_title_trgm_idx ON public.images USING gin (title gin_trgm_ops);

GRANT SELECT, INSERT ON public.images TO anon;

DROP POLICY IF EXISTS "Public images viewable by everyone" ON public.images;
DROP POLICY IF EXISTS "Users delete own images" ON public.images;
DROP POLICY IF EXISTS "Users insert own images" ON public.images;
DROP POLICY IF EXISTS "Users update own images" ON public.images;

CREATE POLICY "View images"
  ON public.images FOR SELECT TO anon, authenticated
  USING (
    (is_public = true AND is_hidden = false)
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Anon can insert anonymous public images"
  ON public.images FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND is_public = true);

CREATE POLICY "Auth can insert own images"
  ON public.images FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can update"
  ON public.images FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners and admins can delete"
  ON public.images FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can upload to anon folder"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'anon'
  );

CREATE POLICY "Authenticated can upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners and admins can delete storage objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Read images bucket"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');
