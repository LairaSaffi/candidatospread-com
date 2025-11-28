import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Mail, Phone, FileText, Briefcase, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Job {
  title: string;
  description: string | null;
  department: string | null;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
}

interface CandidateEvaluation {
  decision: string | null;
  justification: string | null;
}

export default function EvaluateJob() {
  const { token } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, CandidateEvaluation>>({});
  const [evaluationLinkId, setEvaluationLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadJobData();
    }
  }, [token]);

  const loadJobData = async () => {
    try {
      // Buscar link de avaliação e job
      const { data: linkData, error: linkError } = await supabase
        .from("job_evaluation_links")
        .select(`
          id,
          job_id,
          jobs (
            title,
            description,
            department
          )
        `)
        .eq("evaluator_token", token)
        .maybeSingle();

      if (linkError) {
        console.error("Erro ao buscar link:", linkError);
        throw linkError;
      }

      if (!linkData) {
        console.error("Link não encontrado");
        return;
      }

      setEvaluationLinkId(linkData.id);
      const jobData = linkData.jobs as Job;
      setJob(jobData);

      // Buscar candidatos da vaga
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("job_id", linkData.job_id)
        .order("created_at", { ascending: false });

      if (candidatesError) {
        console.error("Erro ao buscar candidatos:", candidatesError);
        throw candidatesError;
      }

      setCandidates(candidatesData || []);

      // Buscar avaliações existentes
      const { data: evalData } = await supabase
        .from("candidate_evaluations")
        .select("*")
        .eq("job_evaluation_link_id", linkData.id);

      if (evalData) {
        const evalMap: Record<string, CandidateEvaluation> = {};
        evalData.forEach((ev: any) => {
          evalMap[ev.candidate_id] = {
            decision: ev.decision,
            justification: ev.justification,
          };
        });
        setEvaluations(evalMap);
      }
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluation = async (
    candidateId: string,
    decision: "interested" | "rejected",
    justification: string
  ) => {
    if (!evaluationLinkId) return;

    try {
      const { error } = await supabase
        .from("candidate_evaluations")
        .upsert({
          job_evaluation_link_id: evaluationLinkId,
          candidate_id: candidateId,
          decision,
          justification: justification || null,
          evaluated_at: new Date().toISOString(),
        }, {
          onConflict: "job_evaluation_link_id,candidate_id"
        });

      if (error) throw error;

      toast({
        title: "Avaliação enviada!",
        description: "Sua avaliação foi registrada com sucesso.",
      });

      await loadJobData();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar avaliação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Link inválido</h2>
            <p className="text-muted-foreground">
              Este link de avaliação não é válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  {job.department && (
                    <CardDescription className="mt-1">
                      Departamento: {job.department}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            {job.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {job.description}
                </p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-lg font-semibold mb-2">Nenhum candidato ainda</h2>
              <p className="text-sm text-muted-foreground">
                Ainda não há candidatos para avaliar nesta vaga.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                {job.department && (
                  <CardDescription className="mt-1">
                    Departamento: {job.department}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          {job.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </CardContent>
          )}
        </Card>

        <div className="mb-4">
          <h2 className="text-xl font-bold">Candidatos para Avaliar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {candidates.length} candidato(s) aguardando sua avaliação
          </p>
        </div>

        <div className="space-y-4">
          {candidates.map((candidate) => {
            const evaluation = evaluations[candidate.id];
            const [justification, setJustification] = useState(evaluation?.justification || "");

            return (
              <Card key={candidate.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{candidate.name}</CardTitle>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {candidate.email}
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {candidate.phone}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {candidate.cv_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(candidate.cv_url!, "_blank")}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Ver CV
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    {candidate.technical_test_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(candidate.technical_test_url!, "_blank")}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Ver Teste
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>

                  {candidate.hr_interview_notes && (
                    <div>
                      <Label className="text-xs font-semibold">Notas da Entrevista RH</Label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-2 rounded-md">
                        {candidate.hr_interview_notes}
                      </p>
                    </div>
                  )}

                  {evaluation?.decision ? (
                    <div className="flex items-center gap-2 pt-2">
                      {evaluation.decision === "interested" ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-success" />
                          <Badge className="bg-success text-success-foreground">
                            Interessado
                          </Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <Badge variant="destructive">Recusado</Badge>
                        </>
                      )}
                      {evaluation.justification && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {evaluation.justification}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <Label htmlFor={`justification-${candidate.id}`} className="text-xs">
                          Justificativa (opcional)
                        </Label>
                        <Textarea
                          id={`justification-${candidate.id}`}
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          placeholder="Adicione uma justificativa se desejar..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEvaluation(candidate.id, "rejected", justification)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Recusar
                        </Button>
                        <Button
                          onClick={() => handleEvaluation(candidate.id, "interested", justification)}
                          size="sm"
                          className="flex-1 bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Interessado
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
