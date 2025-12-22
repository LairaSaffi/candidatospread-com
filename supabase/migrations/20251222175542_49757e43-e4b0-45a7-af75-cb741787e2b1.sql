-- Atualizar os buckets para serem públicos
UPDATE storage.buckets SET public = true WHERE id = 'cvs';
UPDATE storage.buckets SET public = true WHERE id = 'technical-tests';