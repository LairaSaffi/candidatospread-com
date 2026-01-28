import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Candidate {
  id: string;
  name: string;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  job_id: string;
}

interface Job {
  id: string;
  title: string;
}

export default function EditCandidate() {
  const { jobId, candidateId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEditJobs } = useAuth();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [technicalTestFile, setTechnicalTestFile] = useState<File | null>(null);
  const [removeCv, setRemoveCv] = useState(false);
  const [removeTechnicalTest, setRemoveTechnicalTest] = useState(false);

  useEffect(() => {
    if (!canEditJobs) {
      navigate("/");
      return;
    }
    if (jobId && candidateId) {
      loadData();
    }
  }, [jobId, candidateId, canEditJobs]);

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

      if (candidateResult.data) {
        setCandidate(candidateResult.data as Candidate);
        setName(candidateResult.data.name);
        setHrNotes(candidateResult.data.hr_interview_notes || "");
      }
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

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${jobId}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw error;
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate || !name.trim()) return;

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        name: name.trim(),
        hr_interview_notes: hrNotes.trim() || null,
      };

      // Upload novo CV se houver
      if (cvFile) {
        const cvPath = await uploadFile(cvFile, "cvs");
        updates.cv_url = cvPath;
      } else if (removeCv) {
        updates.cv_url = null;
      }

      // Upload novo teste técnico se houver
      if (technicalTestFile) {
        const testPath = await uploadFile(technicalTestFile, "technical-tests");
        updates.technical_test_url = testPath;
      } else if (removeTechnicalTest) {
        updates.technical_test_url = null;
      }

      const { error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", candidateId);

      if (error) throw error;

      toast({
        title: "Candidato atualizado!",
        description: "As informações foram salvas com sucesso.",
      });

      navigate(`/jobs/${jobId}/candidates/${candidateId}`);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${jobId}/candidates/${candidateId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Editar Candidato</CardTitle>
            <CardDescription>
              Atualize as informações de {candidate.name} para a vaga {job.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Candidato *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              {/* CV */}
              <div className="space-y-2">
                <Label htmlFor="cv">Currículo (CV)</Label>
                {candidate.cv_url && !removeCv && !cvFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="text-sm flex-1 truncate">CV atual anexado</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveCv(true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {(removeCv || !candidate.cv_url || cvFile) && (
                  <div className="flex items-center gap-2">
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        setCvFile(e.target.files?.[0] || null);
                        setRemoveCv(false);
                      }}
                      className="flex-1"
                    />
                    {cvFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCvFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Teste Técnico */}
              <div className="space-y-2">
                <Label htmlFor="technical-test">Teste Técnico</Label>
                {candidate.technical_test_url && !removeTechnicalTest && !technicalTestFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="text-sm flex-1 truncate">Teste técnico atual anexado</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveTechnicalTest(true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {(removeTechnicalTest || !candidate.technical_test_url || technicalTestFile) && (
                  <div className="flex items-center gap-2">
                    <Input
                      id="technical-test"
                      type="file"
                      accept=".pdf,.doc,.docx,.zip,.rar"
                      onChange={(e) => {
                        setTechnicalTestFile(e.target.files?.[0] || null);
                        setRemoveTechnicalTest(false);
                      }}
                      className="flex-1"
                    />
                    {technicalTestFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTechnicalTestFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Parecer RH */}
              <div className="space-y-2">
                <Label htmlFor="hr-notes">Parecer do RH</Label>
                <Textarea
                  id="hr-notes"
                  value={hrNotes}
                  onChange={(e) => setHrNotes(e.target.value)}
                  placeholder="Observações da entrevista com RH..."
                  rows={5}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/jobs/${jobId}/candidates/${candidateId}`)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
