import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Plus, FileText, Link as LinkIcon, Pencil, Trash2, Loader2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
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

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  work_model: string | null;
  client: string | null;
  budget: string | null;
  hiring_model: string | null;
  responsible_manager: string | null;
  spread_manager_id: string | null;
  commercial_responsible_id: string | null;
  recruiter_responsible_id: string | null;
  status: "open" | "closed" | "on_hold";
}

interface Candidate {
  id: string;
  name: string;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
}

interface EvaluationLink {
  evaluator_token: string;
}

interface HunterLink {
  hunter_token: string;
}

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluationLink, setEvaluationLink] = useState<EvaluationLink | null>(null);
  const [hunterLink, setHunterLink] = useState<HunterLink | null>(null);
  const [generatingHunterLink, setGeneratingHunterLink] = useState(false);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEditJobs, canCreateJobs, isAdmin } = useAuth();
  const [deleting, setDeleting] = useState(false);

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

      // Buscar perfis dos responsáveis (não inclui responsible_manager que é texto)
      const responsibleIds = [
        jobData.spread_manager_id,
        jobData.commercial_responsible_id,
        jobData.recruiter_responsible_id,
      ].filter(Boolean);

      if (responsibleIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", responsibleIds);

        if (!profilesError && profilesData) {
          const usersMap: Record<string, UserProfile> = {};
          profilesData.forEach((profile) => {
            usersMap[profile.id] = profile;
          });
          setUsers(usersMap);
        }
      }

      const { data: candidateJobsData, error: candidatesError } = await supabase
        .from("candidate_jobs" as any)
        .select("candidate_id, candidates(*)")
        .eq("job_id", id)
        .order("created_at", { ascending: false });

      if (candidatesError) throw candidatesError;
      const candidatesData = (candidateJobsData || []).map((cj: any) => cj.candidates).filter(Boolean);
      setCandidates(candidatesData as Candidate[] || []);

      // Buscar ou criar link de avaliação da vaga
      const { data: existingLink, error: linkError } = await supabase
        .from("job_evaluation_links")
        .select("evaluator_token")
        .eq("job_id", id)
        .maybeSingle();

      if (linkError) throw linkError;

      if (existingLink) {
        setEvaluationLink(existingLink);
      } else {
        // Criar link de avaliação se não existir
        const { data: newLink, error: createError } = await supabase
          .from("job_evaluation_links")
          .insert({ job_id: id })
          .select("evaluator_token")
          .single();

        if (createError) throw createError;
        setEvaluationLink(newLink);
      }

      // Check for existing hunter link
      const { data: existingHunterLink } = await supabase
        .from("hunter_links" as any)
        .select("hunter_token")
        .eq("job_id", id)
        .maybeSingle();

      if (existingHunterLink) {
        setHunterLink(existingHunterLink as any);
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

  const copyEvaluationLink = () => {
    if (!evaluationLink) return;
    const link = `${window.location.origin}/evaluate/${evaluationLink.evaluator_token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link de avaliação da vaga foi copiado para a área de transferência.",
    });
  };

  const generateHunterLink = async () => {
    if (!id) return;
    setGeneratingHunterLink(true);
    try {
      if (hunterLink) {
        const link = `${window.location.origin}/hunter/${hunterLink.hunter_token}`;
        await navigator.clipboard.writeText(link);
        toast({ title: "Link Hunter copiado!", description: "O link para o hunter foi copiado." });
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const { data: newLink, error } = await supabase
        .from("hunter_links" as any)
        .insert({ job_id: id, created_by: session?.session?.user?.id } as any)
        .select("hunter_token")
        .single();

      if (error) throw error;
      setHunterLink(newLink as any);
      const link = `${window.location.origin}/hunter/${(newLink as any).hunter_token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: "Link Hunter gerado e copiado!", description: "O link para o hunter externo foi criado e copiado." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingHunterLink(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Vaga excluída",
        description: "A vaga foi excluída com sucesso.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir vaga",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    return users[userId]?.full_name || null;
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
              <div className="flex-1">
                <CardTitle className="text-3xl">{job.title}</CardTitle>
                <CardDescription className="mt-2 space-y-1">
                  {job.work_model && <div>Modelo de Trabalho: {job.work_model}</div>}
                  {job.client && <div>Cliente: {job.client}</div>}
                  {job.responsible_manager && <div>Gestor Responsável (Cliente): {job.responsible_manager}</div>}
                  {getUserName(job.spread_manager_id) && <div>Gestor Spread: {getUserName(job.spread_manager_id)}</div>}
                  {getUserName(job.commercial_responsible_id) && <div>Responsável Comercial: {getUserName(job.commercial_responsible_id)}</div>}
                  {getUserName(job.recruiter_responsible_id) && <div>Recrutador Responsável: {getUserName(job.recruiter_responsible_id)}</div>}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <StatusBadge status={job.status} />
                <div className="flex gap-2 flex-wrap justify-end">
                  {canEditJobs && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/jobs/${id}/edit`)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleting}
                        >
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
                          <AlertDialogTitle>Excluir vaga?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A vaga "{job.title}" e todos os candidatos associados serão excluídos permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {evaluationLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyEvaluationLink}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      onClick={generateHunterLink}
                      disabled={generatingHunterLink}
                      className="bg-[hsl(25,95%,53%)] hover:bg-[hsl(25,95%,45%)] text-white border-none"
                    >
                      {generatingHunterLink ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Target className="h-4 w-4 mr-2" />
                      )}
                      {hunterLink ? "Copiar Link Hunter" : "Gerar Link Hunter"}
                    </Button>
                  )}
                </div>
              </div>
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
          {canCreateJobs && (
            <Button onClick={() => navigate(`/jobs/${id}/candidates/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Candidato
            </Button>
          )}
        </div>

        {candidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum candidato</h3>
              <p className="text-muted-foreground mb-4">
                Adicione o primeiro candidato a esta vaga
              </p>
              {canCreateJobs && (
                <Button onClick={() => navigate(`/jobs/${id}/candidates/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Candidato
                </Button>
              )}
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
                    </div>
                    <StatusBadge status={candidate.status} />
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
                        Parecer RH
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
