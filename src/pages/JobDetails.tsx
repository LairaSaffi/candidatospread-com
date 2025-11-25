import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Plus, Mail, Phone, FileText, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Job {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  status: "open" | "closed" | "on_hold";
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
  evaluation_token?: string;
}

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadJobAndCandidates();
    }
  }, [id]);

  const loadJobAndCandidates = async () => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (jobError) throw jobError;
      setJob(jobData as Job);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select(`
          *,
          evaluations(evaluator_token)
        `)
        .eq("job_id", id)
        .order("created_at", { ascending: false });

      if (candidatesError) throw candidatesError;
      
      const candidatesWithTokens = candidatesData?.map((c: any) => ({
        ...c,
        evaluation_token: c.evaluations?.[0]?.evaluator_token,
      }));

      setCandidates(candidatesWithTokens || []);
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

  const copyEvaluationLink = (token: string) => {
    const link = `${window.location.origin}/evaluate/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link de avaliação foi copiado para a área de transferência.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Vaga não encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl">{job.title}</CardTitle>
                <CardDescription className="mt-2 space-y-1">
                  {job.department && <div>Departamento: {job.department}</div>}
                  {job.location && <div>Localização: {job.location}</div>}
                  {job.employment_type && <div>Tipo: {job.employment_type}</div>}
                </CardDescription>
              </div>
              <StatusBadge status={job.status} />
            </div>
          </CardHeader>
          {job.description && (
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          )}
        </Card>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Candidatos</h2>
            <p className="text-muted-foreground mt-1">
              {candidates.length} candidatos para esta vaga
            </p>
          </div>
          <Button onClick={() => navigate(`/jobs/${id}/candidates/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Candidato
          </Button>
        </div>

        {candidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum candidato</h3>
              <p className="text-muted-foreground mb-4">
                Adicione o primeiro candidato a esta vaga
              </p>
              <Button onClick={() => navigate(`/jobs/${id}/candidates/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Candidato
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <Card
                key={candidate.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/jobs/${id}/candidates/${candidate.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{candidate.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {candidate.email}
                        </div>
                        {candidate.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {candidate.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <StatusBadge status={candidate.status} />
                      {candidate.evaluation_token && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyEvaluationLink(candidate.evaluation_token!);
                          }}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Copiar Link
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {candidate.cv_url && (
                      <Badge variant="secondary">
                        <FileText className="h-3 w-3 mr-1" />
                        CV Anexado
                      </Badge>
                    )}
                    {candidate.technical_test_url && (
                      <Badge variant="secondary">
                        <FileText className="h-3 w-3 mr-1" />
                        Teste Técnico
                      </Badge>
                    )}
                    {candidate.hr_interview_notes && (
                      <Badge variant="secondary">
                        <FileText className="h-3 w-3 mr-1" />
                        Notas RH
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
