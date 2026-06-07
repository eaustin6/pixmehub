
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- images
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  title TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes BIGINT,
  mime_type TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX images_user_id_idx ON public.images(user_id);
CREATE INDEX images_created_at_idx ON public.images(created_at DESC);
GRANT SELECT ON public.images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.images TO authenticated;
GRANT ALL ON public.images TO service_role;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public images viewable by everyone" ON public.images FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users insert own images" ON public.images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own images" ON public.images FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own images" ON public.images FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- storage RLS for the images bucket
CREATE POLICY "Image objects are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own image objects"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own image objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
