import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, FileText, Loader2, ExternalLink, CheckCircle, XCircle, User, Link2, Pencil, Trash2, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openSignedFile } from "@/lib/storage";
import { InternalEvaluationDialog } from "@/components/InternalEvaluationDialog";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CandidateTag {
  id: string;
  name: string;
}

interface Candidate {
  id: string;
  name: string;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  seniority: string | null;
  status: string;
  internal_status: string | null;
  salary_expectation: string | null;
  created_at: string;
  job_id: string;
}

interface Job {
  id: string;
  title: string;
}

interface CandidateEvaluation {
  id: string;
  decision: string | null;
  justification: string | null;
  interview_schedule_options: string | null;
  evaluated_at: string | null;
  evaluated_by_user_id: string | null;
  evaluator_name?: string | null;
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Júnior", pleno: "Pleno", senior: "Sênior", especialista: "Especialista", gestao: "Gestão",
};

export default function CandidateDetails() {
  const { jobId, candidateId } = useParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [evaluation, setEvaluation] = useState<CandidateEvaluation | null>(null);
  const [candidateTags, setCandidateTags] = useState<CandidateTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, canEditJobs } = useAuth();

  useEffect(() => {
    if (candidateId) {
      loadData();
    }
  }, [jobId, candidateId]);

  const loadData = async () => {
    try {
      const candidateResult = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .maybeSingle();

      if (candidateResult.error) throw candidateResult.error;

      // Determine jobId: from URL params, from candidate data, or from candidate_jobs
      const effectiveJobId = jobId || candidateResult.data?.job_id;

      let jobResult = null;
      if (effectiveJobId) {
        jobResult = await supabase
          .from("jobs")
          .select("id, title")
          .eq("id", effectiveJobId)
          .maybeSingle();
        if (jobResult.error) throw jobResult.error;
      }


      const candidateData = candidateResult.data as any;
      setCandidate({ ...candidateData, internal_status: candidateData.internal_status || null, salary_expectation: candidateData.salary_expectation || null } as Candidate);
      setJob(jobResult?.data || null);

      // Load candidate tags
      const { data: ctData } = await supabase
        .from("candidate_tags")
        .select("tag_id, tags(id, name)")
        .eq("candidate_id", candidateId!);
      if (ctData) {
        setCandidateTags(ctData.map((ct: any) => ct.tags).filter(Boolean));
      }

      // Buscar avaliação do candidato
      if (candidateResult.data) {
        const { data: evalData } = await supabase
          .from("candidate_evaluations")
          .select("id, decision, justification, interview_schedule_options, evaluated_at, evaluated_by_user_id")
          .eq("candidate_id", candidateId)
          .not("decision", "is", null)
          .order("evaluated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (evalData) {
          let evaluatorName: string | null = null;
          
          if (evalData.evaluated_by_user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", evalData.evaluated_by_user_id)
              .maybeSingle();
            
            evaluatorName = profileData?.full_name || null;
          }

          setEvaluation({
            ...evalData,
            evaluator_name: evaluatorName,
          });
        }
      }
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

  const handleDeleteCandidate = async () => {
    if (!candidateId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", candidateId);

      if (error) throw error;

      toast({
        title: "Candidato excluído",
        description: "O candidato foi removido com sucesso.",
      });
      if (jobId) navigate(`/jobs/${jobId}`);
      else navigate("/talents");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!candidateId) return;
    setGeneratingLink(true);
    try {
      // Check if link already exists
      const { data: existing } = await supabase
        .from("candidate_share_links" as any)
        .select("share_token")
        .eq("candidate_id", candidateId)
        .limit(1)
        .maybeSingle();

      let token: string;
      if ((existing as any)?.share_token) {
        token = (existing as any).share_token;
      } else {
        const { data: newLink, error } = await supabase
          .from("candidate_share_links" as any)
          .insert({ candidate_id: candidateId, created_by: user?.id } as any)
          .select("share_token")
          .single();
        if (error) throw error;
        token = (newLink as any).share_token;
      }

      const url = `${window.location.origin}/candidate/${token}`;
      setShareLink(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({ title: "Link copiado!", description: "O link do candidato foi copiado para a área de transferência." });
    } catch (error: any) {
      toast({ title: "Erro ao gerar link", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
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
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl">{candidate.name}</CardTitle>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  {candidate.internal_status && (
                    <StatusBadge status={candidate.internal_status} />
                  )}
                </div>
                {canEditJobs && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateShareLink}
                      disabled={generatingLink}
                    >
                      {generatingLink ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : copied ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Share2 className="h-4 w-4 mr-2" />
                      )}
                      {copied ? "Link Copiado!" : "Gerar Link"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (jobId) navigate(`/jobs/${jobId}/candidates/${candidateId}/edit`);
                        else navigate(`/candidates/${candidateId}/edit`);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={deleting}>
                          {deleting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir candidato?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O candidato "{candidate.name}" e todas as suas avaliações serão excluídos permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteCandidate}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {candidate.seniority && (
                <Badge variant="secondary">{SENIORITY_LABELS[candidate.seniority] || candidate.seniority}</Badge>
              )}
              {candidateTags.map((tag) => (
                <Badge key={tag.id} variant="outline">#{tag.name}</Badge>
              ))}
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

        {/* Pretensão Salarial */}
        {candidate.salary_expectation && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Pretensão Salarial</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{candidate.salary_expectation}</p>
            </CardContent>
          </Card>
        )}

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