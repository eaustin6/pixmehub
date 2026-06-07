DROP POLICY IF EXISTS "Authenticated can upload to own folder" ON storage.objects;

CREATE POLICY "Read image objects with access control"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'images'
  AND (
    -- Owner reads their own files
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = (auth.uid())::text)
    -- Super admins read anything
    OR has_role(auth.uid(), 'super_admin'::app_role)
    -- Anyone can read files that correspond to a public, non-hidden image row
    OR EXISTS (
      SELECT 1 FROM public.images i
      WHERE i.storage_path = storage.objects.name
        AND i.is_public = true
        AND i.is_hidden = false
    )
  )
);