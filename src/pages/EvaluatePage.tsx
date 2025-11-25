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

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  job: {
    title: string;
    description: string | null;
    department: string | null;
  };
}

interface Evaluation {
  decision: string | null;
  justification: string | null;
  evaluated_at: string | null;
}

export default function EvaluatePage() {
  const { token } = useParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadCandidateData();
    }
  }, [token]);

  const loadCandidateData = async () => {
    try {
      const { data: evalData, error: evalError } = await supabase
        .from("evaluations")
        .select(`
          *,
          candidates (
            *,
            jobs (title, description, department)
          )
        `)
        .eq("evaluator_token", token)
        .single();

      if (evalError) throw evalError;

      if (evalData) {
        setEvaluation({
          decision: evalData.decision,
          justification: evalData.justification,
          evaluated_at: evalData.evaluated_at,
        });
        
        const candidateData: any = evalData.candidates;
        setCandidate({
          id: candidateData.id,
          name: candidateData.name,
          email: candidateData.email,
          phone: candidateData.phone,
          cv_url: candidateData.cv_url,
          technical_test_url: candidateData.technical_test_url,
          hr_interview_notes: candidateData.hr_interview_notes,
          job: candidateData.jobs,
        });
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

  const handleSubmit = async (decision: "interested" | "rejected") => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("evaluations")
        .update({
          decision,
          justification: justification || null,
          evaluated_at: new Date().toISOString(),
        })
        .eq("evaluator_token", token);

      if (error) throw error;

      toast({
        title: "Avaliação enviada!",
        description: "Sua avaliação foi registrada com sucesso.",
      });

      await loadCandidateData();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar avaliação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Link inválido</h2>
            <p className="text-muted-foreground">
              Este link de avaliação não é válido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasEvaluated = evaluation?.decision !== null;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{candidate.job.title}</CardTitle>
                {candidate.job.department && (
                  <CardDescription className="mt-1">
                    Departamento: {candidate.job.department}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          {candidate.job.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {candidate.job.description}
              </p>
            </CardContent>
          )}
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Candidato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{candidate.name}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {candidate.email}
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {candidate.phone}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {candidate.cv_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(candidate.cv_url!, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Currículo
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
              {candidate.technical_test_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(candidate.technical_test_url!, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Teste Técnico
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>

            {candidate.hr_interview_notes && (
              <div>
                <Label className="text-sm font-semibold">Notas da Entrevista RH</Label>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {candidate.hr_interview_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {hasEvaluated ? (
          <Card>
            <CardHeader>
              <CardTitle>Avaliação Enviada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {evaluation?.decision === "interested" ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-success" />
                      <Badge className="bg-success text-success-foreground">
                        Interessado em Entrevistar
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      <Badge variant="destructive">Recusado</Badge>
                    </>
                  )}
                </div>
                {evaluation?.justification && (
                  <div>
                    <Label className="text-sm font-semibold">Justificativa</Label>
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                      {evaluation.justification}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Avaliar Candidato</CardTitle>
              <CardDescription>
                Indique se tem interesse em entrevistar este candidato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="justification">
                  Justificativa (opcional)
                </Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Adicione uma justificativa se desejar..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleSubmit("rejected")}
                  disabled={submitting}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Recusar
                </Button>
                <Button
                  onClick={() => handleSubmit("interested")}
                  disabled={submitting}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Interessado
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
