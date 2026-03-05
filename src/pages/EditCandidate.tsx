import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const SENIORITY_OPTIONS = [
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "gestao", label: "Gestão" },
];

const INTERNAL_STATUS_OPTIONS = [
  { value: "em_contratacao", label: "Em Contratação" },
  { value: "contratado", label: "Contratado" },
  { value: "disponivel", label: "Disponível" },
  { value: "reprovado_interno", label: "Reprovado" },
];

const CANDIDATE_TYPE_OPTIONS = [
  { value: "interno", label: "Interno" },
  { value: "externo", label: "Externo" },
];


interface Tag {
  id: string;
  name: string;
}

export default function EditCandidate() {
  const { jobId, candidateId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEditJobs, isAdmin } = useAuth();

  const [candidate, setCandidate] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [seniority, setSeniority] = useState("");
  const [candidateType, setCandidateType] = useState("externo");
  const [internalStatus, setInternalStatus] = useState("");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [technicalTestFile, setTechnicalTestFile] = useState<File | null>(null);
  const [removeCv, setRemoveCv] = useState(false);
  const [removeTechnicalTest, setRemoveTechnicalTest] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!canEditJobs) { navigate("/"); return; }
    if (candidateId) loadData();
  }, [candidateId, canEditJobs]);

  const loadData = async () => {
    try {
      const candidateResult = await supabase.from("candidates").select("*").eq("id", candidateId).maybeSingle();
      const tagsResult = await supabase.from("tags").select("*").order("name");
      const candidateTagsResult = await supabase.from("candidate_tags").select("tag_id").eq("candidate_id", candidateId!);
      
      let jobResult: any = null;
      if (jobId) {
        jobResult = await supabase.from("jobs").select("id, title").eq("id", jobId).maybeSingle();
      }

      if (candidateResult.error) throw candidateResult.error;

      if (candidateResult.data) {
        setCandidate(candidateResult.data);
        setName(candidateResult.data.name);
        setPosition((candidateResult.data as any).position || "");
        setSeniority(candidateResult.data.seniority || "");
        setCandidateType((candidateResult.data as any).candidate_type || "externo");
        setInternalStatus((candidateResult.data as any).internal_status || "");
        setSalaryExpectation((candidateResult.data as any).salary_expectation || "");
        setHrNotes(candidateResult.data.hr_interview_notes || "");
      }
      setJob(jobResult?.data || null);
      if (tagsResult.data) setTags(tagsResult.data);
      if (candidateTagsResult.data) setSelectedTags(candidateTagsResult.data.map((ct: any) => ct.tag_id));
    } catch (error: any) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  };

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${jobId}/${fileName}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
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
        position: position.trim() || null,
        seniority: seniority || null,
        candidate_type: candidateType || "externo",
        internal_status: internalStatus || null,
        salary_expectation: salaryExpectation.trim() || null,
        hr_interview_notes: hrNotes.trim() || null,
      };

      if (cvFile) {
        updates.cv_url = await uploadFile(cvFile, "cvs");
      } else if (removeCv) {
        updates.cv_url = null;
      }

      if (technicalTestFile) {
        updates.technical_test_url = await uploadFile(technicalTestFile, "technical-tests");
      } else if (removeTechnicalTest) {
        updates.technical_test_url = null;
      }

      const { error } = await supabase.from("candidates").update(updates as any).eq("id", candidateId);
      if (error) throw error;

      // Update tags: delete old, insert new
      await supabase.from("candidate_tags").delete().eq("candidate_id", candidateId!);
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map((tagId) => ({ candidate_id: candidateId!, tag_id: tagId }));
        await supabase.from("candidate_tags").insert(tagInserts);
      }

      toast({ title: "Candidato atualizado!", description: "As informações foram salvas com sucesso." });
      navigate(-1);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
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

  if (!candidate) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <div className="text-lg text-muted-foreground">Candidato não encontrado</div>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar ao Dashboard</Button>
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Editar Candidato</CardTitle>
            {job && <CardDescription>Atualize as informações de {candidate.name} para a vaga {job.title}</CardDescription>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Candidato *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ex: Desenvolvedor Full Stack" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={candidateType} onValueChange={setCandidateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Interno ou Externo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANDIDATE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seniority">Senioridade</Label>
                  <Select value={seniority} onValueChange={setSeniority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a senioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {SENIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="internal-status">Status Interno</Label>
                  <Select value={internalStatus} onValueChange={setInternalStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status interno" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERNAL_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags de Conhecimento</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[42px]">
                  {tags.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Nenhuma tag cadastrada</span>
                  ) : (
                    tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag.id)}
                      >
                        #{tag.name}
                        {selectedTags.includes(tag.id) && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary-expectation">Pretensão Salarial</Label>
                <Input id="salary-expectation" value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder="Ex: R$ 8.000 - R$ 10.000" />
              </div>

              {/* CV */}
              <div className="space-y-2">
                <Label htmlFor="cv">Currículo (CV)</Label>
                {candidate.cv_url && !removeCv && !cvFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="text-sm flex-1 truncate">CV atual anexado</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveCv(true)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {(removeCv || !candidate.cv_url || cvFile) && (
                  <div className="flex items-center gap-2">
                    <Input id="cv" type="file" accept=".pdf,.doc,.docx" onChange={(e) => { setCvFile(e.target.files?.[0] || null); setRemoveCv(false); }} className="flex-1" />
                    {cvFile && <Button type="button" variant="ghost" size="sm" onClick={() => setCvFile(null)}><X className="h-4 w-4" /></Button>}
                  </div>
                )}
              </div>

              {/* Teste Técnico */}
              <div className="space-y-2">
                <Label htmlFor="technical-test">Teste Técnico</Label>
                {candidate.technical_test_url && !removeTechnicalTest && !technicalTestFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="text-sm flex-1 truncate">Teste técnico atual anexado</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveTechnicalTest(true)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {(removeTechnicalTest || !candidate.technical_test_url || technicalTestFile) && (
                  <div className="flex items-center gap-2">
                    <Input id="technical-test" type="file" accept=".pdf,.doc,.docx,.zip,.rar" onChange={(e) => { setTechnicalTestFile(e.target.files?.[0] || null); setRemoveTechnicalTest(false); }} className="flex-1" />
                    {technicalTestFile && <Button type="button" variant="ghost" size="sm" onClick={() => setTechnicalTestFile(null)}><X className="h-4 w-4" /></Button>}
                  </div>
                )}
              </div>

              {/* Parecer RH */}
              <div className="space-y-2">
                <Label htmlFor="hr-notes">Parecer do RH</Label>
                <Textarea id="hr-notes" value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} placeholder="Observações da entrevista com RH..." rows={5} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancelar</Button>
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
