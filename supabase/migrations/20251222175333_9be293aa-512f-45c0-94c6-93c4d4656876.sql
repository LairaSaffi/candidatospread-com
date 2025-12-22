-- Permitir que qualquer pessoa leia arquivos dos buckets cvs e technical-tests
-- Isso é necessário para que avaliadores externos possam visualizar os CVs

CREATE POLICY "Qualquer pessoa pode ler CVs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cvs');

CREATE POLICY "Qualquer pessoa pode ler testes técnicos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'technical-tests');