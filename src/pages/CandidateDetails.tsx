import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, FileText, Download, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openSignedFile } from "@/lib/storage";

interface Candidate {
  id: string;
  name: string;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
  created_at: string;
  job_id: string;
}

interface Job {
  id: string;
  title: string;
}

export default function CandidateDetails() {
  const { jobId, candidateId } = useParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (jobId && candidateId) {
      loadData();
    }
  }, [jobId, candidateId]);

  const loadData = async () => {
    try {
      const [candidateResult, jobResult] = await Promise.all([
        supabase
          .from("candidates")
          .select("*")
          .eq("id", candidateId)
          .maybeSingle(),
        supabase
          .from("jobs")
          .select("id, title")
          .eq("id", jobId)
          .maybeSingle()
      ]);

      if (candidateResult.error) throw candidateResult.error;
      if (jobResult.error) throw jobResult.error;

      setCandidate(candidateResult.data as Candidate);
      setJob(jobResult.data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
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
      // Verificar se é uma URL completa ou apenas o path
      if (filePath.startsWith("http")) {
        window.open(filePath, "_blank");
      } else {
        // É apenas o path, usar URL assinada
        const bucket = type === "cv" ? "cvs" : "technical-tests";
        await openSignedFile(bucket, filePath);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao abrir arquivo",
        description: error.message,
        variant: "destructive",
      });
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

  if (!candidate || !job) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <div className="text-lg text-muted-foreground">Candidato não encontrado</div>
        <Button variant="outline" onClick={() => navigate("/")}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${jobId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para {job.title}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl">{candidate.name}</CardTitle>
                <CardDescription className="mt-2">
                  Candidato para: {job.title}
                </CardDescription>
              </div>
              <StatusBadge status={candidate.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Cadastrado em: {new Date(candidate.created_at).toLocaleDateString("pt-BR")}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* CV */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Currículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.cv_url ? (
                <Button
                  onClick={() => handleOpenFile("cv")}
                  disabled={openingFile === "cv"}
                  className="w-full"
                >
                  {openingFile === "cv" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Abrir CV
                </Button>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum CV anexado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Teste Técnico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Teste Técnico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.technical_test_url ? (
                <Button
                  onClick={() => handleOpenFile("technical_test")}
                  disabled={openingFile === "technical_test"}
                  className="w-full"
                >
                  {openingFile === "technical_test" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Abrir Teste Técnico
                </Button>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum teste técnico anexado
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Parecer RH */}
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