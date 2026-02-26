import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openSignedFile } from "@/lib/storage";
import logoSpread from "@/assets/logo-spread.jpg";

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Júnior", pleno: "Pleno", senior: "Sênior", especialista: "Especialista", gestao: "Gestão",
};

interface CandidateData {
  id: string;
  name: string;
  seniority: string | null;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
}

interface TagData {
  id: string;
  name: string;
}

export default function ViewCandidate() {
  const { token } = useParams();
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (token) loadCandidate();
  }, [token]);

  const loadCandidate = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc("get_candidate_by_share_token", {
        p_token: token,
      });

      if (rpcError) throw rpcError;
      if (!data) {
        setError("Link inválido ou expirado.");
        return;
      }

      const result = data as any;
      setCandidate(result.candidate);
      setTags(result.tags || []);
    } catch (err: any) {
      setError("Erro ao carregar dados do candidato.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (type: "cv" | "technical_test") => {
    if (!candidate) return;
    const filePath = type === "cv" ? candidate.cv_url : candidate.technical_test_url;
    if (!filePath) return;

    setOpeningFile(type);
    try {
      if (filePath.startsWith("http")) {
        window.open(filePath, "_blank");
      } else {
        const bucket = type === "cv" ? "cvs" : "technical-tests";
        await openSignedFile(bucket, filePath);
      }
    } catch (err: any) {
      toast({ title: "Erro ao abrir arquivo", description: err.message, variant: "destructive" });
    } finally {
      setOpeningFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <img src={logoSpread} alt="Spread" className="h-12 object-contain" />
        <div className="text-lg text-muted-foreground">{error || "Candidato não encontrado"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoSpread} alt="Spread" className="h-8 object-contain" />
          <span className="text-muted-foreground text-sm">Perfil do Candidato</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{candidate.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {candidate.seniority && (
                <Badge variant="secondary">
                  {SENIORITY_LABELS[candidate.seniority] || candidate.seniority}
                </Badge>
              )}
              {tags.map((tag) => (
                <Badge key={tag.id} variant="outline">#{tag.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Currículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.cv_url ? (
                <Button onClick={() => handleOpenFile("cv")} disabled={openingFile === "cv"} className="w-full">
                  {openingFile === "cv" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Abrir CV
                </Button>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum CV anexado</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Teste Técnico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.technical_test_url ? (
                <Button onClick={() => handleOpenFile("technical_test")} disabled={openingFile === "technical_test"} className="w-full">
                  {openingFile === "technical_test" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Abrir Teste Técnico
                </Button>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum teste técnico anexado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {candidate.hr_interview_notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Parecer do RH</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{candidate.hr_interview_notes}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
