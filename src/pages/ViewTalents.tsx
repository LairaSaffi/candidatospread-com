import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ExternalLink, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openSignedFile } from "@/lib/storage";
import logoSpread from "@/assets/logo-spread.jpg";

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Júnior", pleno: "Pleno", senior: "Sênior", especialista: "Especialista", gestao: "Gestão",
};

interface TagData { id: string; name: string; }

interface CandidateData {
  id: string;
  name: string;
  seniority: string | null;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  tags: TagData[];
}

export default function ViewTalents() {
  const { token } = useParams();
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (token) loadTalents();
  }, [token]);

  const loadTalents = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc("get_talents_by_share_token", {
        p_token: token,
      });

      if (rpcError) throw rpcError;
      if (!data) {
        setError("Link inválido ou expirado.");
        return;
      }

      const result = data as any;
      setCandidates(result.candidates || []);
    } catch (err: any) {
      setError("Erro ao carregar talentos.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (candidateId: string, type: "cv" | "technical_test", filePath: string) => {
    const key = `${candidateId}-${type}`;
    setOpeningFile(key);
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

  if (error || candidates.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <img src={logoSpread} alt="Spread" className="h-12 object-contain" />
        <div className="text-lg text-muted-foreground">{error || "Nenhum talento encontrado"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoSpread} alt="Spread" className="h-8 object-contain" />
          <span className="text-muted-foreground text-sm">Talentos Disponíveis</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{candidates.length} Talento{candidates.length !== 1 ? "s" : ""}</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {candidates.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-xl">{c.name}</CardTitle>
                {c.seniority && (
                  <Badge variant="secondary" className="w-fit mt-1">
                    Senioridade: {SENIORITY_LABELS[c.seniority] || c.seniority}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {c.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline" className="text-xs">#{tag.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {c.cv_url && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenFile(c.id, "cv", c.cv_url!)}
                      disabled={openingFile === `${c.id}-cv`}
                    >
                      {openingFile === `${c.id}-cv` ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3 w-3 mr-1" />
                      )}
                      Abrir CV
                    </Button>
                  )}
                  {c.technical_test_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenFile(c.id, "technical_test", c.technical_test_url!)}
                      disabled={openingFile === `${c.id}-technical_test`}
                    >
                      {openingFile === `${c.id}-technical_test` ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3 mr-1" />
                      )}
                      Teste Técnico
                    </Button>
                  )}
                </div>

                {c.hr_interview_notes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Parecer do RH</p>
                    <p className="text-sm whitespace-pre-wrap">{c.hr_interview_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
