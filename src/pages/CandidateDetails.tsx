import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, FileText, Loader2, ExternalLink, CheckCircle, XCircle, User, Link2, Pencil, Trash2 } from "lucide-react";
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

interface CandidateEvaluation {
  id: string;
  decision: string | null;
  justification: string | null;
  interview_schedule_options: string | null;
  evaluated_at: string | null;
  evaluated_by_user_id: string | null;
  evaluator_name?: string | null;
}

export default function CandidateDetails() {
  const { jobId, candidateId } = useParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [evaluation, setEvaluation] = useState<CandidateEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, canEditJobs } = useAuth();

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
      navigate(`/jobs/${jobId}`);
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
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={candidate.status} />
                {canEditJobs && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/jobs/${jobId}/candidates/${candidateId}/edit`)}
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

        {/* Avaliação */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Avaliação
              </CardTitle>
              {user && (
                <InternalEvaluationDialog
                  candidateId={candidate.id}
                  candidateName={candidate.name}
                  jobId={job.id}
                  currentDecision={evaluation?.decision}
                  currentJustification={evaluation?.justification}
                  currentScheduleOptions={evaluation?.interview_schedule_options}
                  onEvaluationComplete={loadData}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {evaluation ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {evaluation.decision === "interested" ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-success" />
                      <Badge className="bg-success text-success-foreground">
                        Aprovado para Entrevista
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      <Badge variant="destructive">Reprovado</Badge>
                    </>
                  )}
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {evaluation.evaluated_by_user_id ? (
                      <>
                        <User className="h-4 w-4" />
                        <span>Avaliado por: <strong className="text-foreground">{evaluation.evaluator_name || "Usuário interno"}</strong></span>
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" />
                        <span>Avaliado via <strong className="text-foreground">link externo</strong></span>
                      </>
                    )}
                  </div>
                  
                  {evaluation.evaluated_at && (
                    <div className="text-muted-foreground">
                      Data: {format(new Date(evaluation.evaluated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                </div>

                {evaluation.decision === "rejected" && evaluation.justification && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Motivo da reprovação:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {evaluation.justification}
                    </p>
                  </div>
                )}

                {evaluation.decision === "interested" && evaluation.interview_schedule_options && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Sugestão de horários:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {evaluation.interview_schedule_options}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Nenhuma avaliação registrada ainda.</p>
                {user && (
                  <p className="text-sm mt-1">Clique em "Avaliar" para registrar sua avaliação.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}