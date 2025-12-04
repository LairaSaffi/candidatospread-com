import { supabase } from "@/integrations/supabase/client";

/**
 * Gera uma URL assinada para arquivos em buckets privados
 * @param bucket Nome do bucket (cvs, technical-tests)
 * @param filePath Caminho do arquivo no bucket
 * @param expiresIn Tempo de expiração em segundos (padrão: 1 hora)
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("Erro ao gerar URL assinada:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Abre um arquivo em uma nova aba usando URL assinada
 * @param bucket Nome do bucket
 * @param filePath Caminho do arquivo
 */
export async function openSignedFile(bucket: string, filePath: string): Promise<void> {
  const signedUrl = await getSignedUrl(bucket, filePath);
  if (signedUrl) {
    window.open(signedUrl, "_blank");
  }
}
