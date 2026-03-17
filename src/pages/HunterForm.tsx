import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { X, CheckCircle, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import logoSpread from "@/assets/logo-spread.jpg";

const SENIORITY_OPTIONS = [
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "gestao", label: "Gestão" },
];

const CANDIDATE_TYPE_OPTIONS = [
  { value: "interno", label: "Interno" },
  { value: "externo", label: "Externo" },
];

const HIRING_MODEL_OPTIONS = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "ambos", label: "Ambos" },
];

interface Tag {
  id: string;
  name: string;
}

interface JobInfo {
  id: string;
  title: string;
  description: string | null;
  budget: string | null;
  hiring_model: string | null;
  work_model: string | null;
}

interface CandidateEntry {
  id: string;
  name: string;
  position: string;
  seniority: string;
  candidateType: string;
  salaryExpectation: string;
  hiringModel: string;
  hrNotes: string;
  selectedTags: string[];
  cvFile: File | null;
  spreadCvFile: File | null;
}

const createEmptyCandidate = (): CandidateEntry => ({
  id: crypto.randomUUID(),
  name: "",
  position: "",
  seniority: "",
  candidateType: "externo",
  salaryExpectation: "",
  hiringModel: "",
  hrNotes: "",
  selectedTags: [],
  cvFile: null,
  spreadCvFile: null,
});

export default function HunterForm() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [hunterLinkId, setHunterLinkId] = useState("");
  const [job, setJob] = useState<JobInfo | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

  const [hunterName, setHunterName] = useState("");
  const [hunterEmail, setHunterEmail] = useState("");
  const [candidates, setCandidates] = useState<CandidateEntry[]>([createEmptyCandidate()]);

  const { toast } = useToast();

  useEffect(() => {
    if (token) loadFormData();
  }, [token]);

  const loadFormData = async () => {
    try {
      const { data, error } = await supabase.rpc("get_hunter_form_data", {
        p_token: token,
      });
      if (error) throw error;
      if (!data) {
        setInvalidLink(true);
        return;
      }
      const parsed = data as any;
      setHunterLinkId(parsed.hunter_link_id);
      setJob(parsed.job);
      setTags(parsed.tags || []);
    } catch {
      setInvalidLink(true);
    } finally {
      setLoading(false);
    }
  };

  const updateCandidate = useCallback((id: string, field: keyof CandidateEntry, value: any) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }, []);

  const toggleTag = useCallback((candidateId: string, tagId: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c;
        const tags = c.selectedTags.includes(tagId)
          ? c.selectedTags.filter((t) => t !== tagId)
          : [...c.selectedTags, tagId];
        return { ...c, selectedTags: tags };
      })
    );
  }, []);

  const addCandidate = () => {
    setCandidates((prev) => [...prev, createEmptyCandidate()]);
  };

  const removeCandidate = (id: string) => {
    if (candidates.length <= 1) return;
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hunterName.trim() || !hunterEmail.trim()) {
      toast({ title: "Preencha seu nome e e-mail", variant: "destructive" });
      return;
    }
    for (const c of candidates) {
      if (!c.name.trim() || !c.hrNotes.trim()) {
        toast({ title: `Preencha nome e parecer RH de todos os candidatos`, variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);

    try {
      for (const c of candidates) {
        const formData = new FormData();
        formData.append("hunter_token", token!);
        formData.append("hunter_name", hunterName);
        formData.append("hunter_email", hunterEmail);
        formData.append("name", c.name);
        if (c.position) formData.append("position", c.position);
        if (c.seniority) formData.append("seniority", c.seniority);
        formData.append("candidate_type", c.candidateType);
        if (c.salaryExpectation) formData.append("salary_expectation", c.salaryExpectation);
        if (c.hiringModel) formData.append("hiring_model", c.hiringModel);
        if (c.hrNotes) formData.append("hr_notes", c.hrNotes);
        if (c.selectedTags.length > 0) formData.append("tags", JSON.stringify(c.selectedTags));
        if (c.cvFile) formData.append("cv_file", c.cvFile);
        if (c.spreadCvFile) formData.append("spread_cv_file", c.spreadCvFile);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-hunter-candidate`,
          {
            method: "POST",
            headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: formData,
          }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Erro ao enviar candidato");
      }
      setSubmitted(true);
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCandidates([createEmptyCandidate()]);
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Link inválido</h2>
            <p className="text-muted-foreground">Este link de hunter não é válido ou foi removido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">
              {candidates.length > 1 ? `${candidates.length} candidatos enviados!` : "Candidato enviado!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              Os candidatos foram enviados com sucesso para avaliação da equipe.
            </p>
            <Button onClick={resetForm} className="bg-[hsl(25,95%,53%)] hover:bg-[hsl(25,95%,45%)] text-white">
              Enviar mais candidatos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoSpread} alt="Spread Logo" className="h-8 w-auto" />
          <div>
            <h1 className="text-lg font-bold">Portal Hunter</h1>
            <p className="text-xs text-muted-foreground">Indicação de candidatos</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {job && (
          <Card className="mb-6 border-l-4 border-l-[hsl(25,95%,53%)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{job.title}</CardTitle>
              <CardDescription className="space-y-1">
                {job.hiring_model && <div>Modelo de Contratação: {job.hiring_model}</div>}
                {job.budget && <div>Budget: {job.budget}</div>}
              </CardDescription>
            </CardHeader>
            {job.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            )}
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          {/* Hunter identification */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Identificação do Hunter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hunterName">Seu Nome *</Label>
                  <Input id="hunterName" value={hunterName} onChange={(e) => setHunterName(e.target.value)} placeholder="Nome completo" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hunterEmail">Seu E-mail *</Label>
                  <Input id="hunterEmail" type="email" value={hunterEmail} onChange={(e) => setHunterEmail(e.target.value)} placeholder="email@exemplo.com" required />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Candidates */}
          {candidates.map((candidate, index) => (
            <Card key={candidate.id} className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Candidato {candidates.length > 1 ? `#${index + 1}` : ""}
                  </CardTitle>
                  {candidates.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeCandidate(candidate.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" /> Remover
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={candidate.name} onChange={(e) => updateCandidate(candidate.id, "name", e.target.value)} placeholder="Nome do candidato" required />
                </div>

                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={candidate.position} onChange={(e) => updateCandidate(candidate.id, "position", e.target.value)} placeholder="Ex: Desenvolvedor Full Stack" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={candidate.candidateType} onValueChange={(v) => updateCandidate(candidate.id, "candidateType", v)}>
                      <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        {CANDIDATE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Senioridade</Label>
                    <Select value={candidate.seniority} onValueChange={(v) => updateCandidate(candidate.id, "seniority", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {SENIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Modelo de Contratação</Label>
                  <Select value={candidate.hiringModel} onValueChange={(v) => updateCandidate(candidate.id, "hiringModel", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                    <SelectContent>
                      {HIRING_MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tags de Conhecimento</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[42px]">
                    {tags.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Nenhuma tag disponível</span>
                    ) : (
                      tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={candidate.selectedTags.includes(tag.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleTag(candidate.id, tag.id)}
                        >
                          #{tag.name}
                          {candidate.selectedTags.includes(tag.id) && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pretensão Salarial</Label>
                  <Input value={candidate.salaryExpectation} onChange={(e) => updateCandidate(candidate.id, "salaryExpectation", e.target.value)} placeholder="Ex: R$ 8.000 - R$ 10.000" />
                </div>

                <div className="space-y-2">
                  <Label>CV Padrão (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".pdf" onChange={(e) => updateCandidate(candidate.id, "cvFile", e.target.files?.[0] || null)} className="cursor-pointer" />
                    {candidate.cvFile && <Button type="button" variant="ghost" size="sm" onClick={() => updateCandidate(candidate.id, "cvFile", null)}>Remover</Button>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CV Modelo Spread (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".pdf" onChange={(e) => updateCandidate(candidate.id, "spreadCvFile", e.target.files?.[0] || null)} className="cursor-pointer" />
                    {candidate.spreadCvFile && <Button type="button" variant="ghost" size="sm" onClick={() => updateCandidate(candidate.id, "spreadCvFile", null)}>Remover</Button>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Parecer RH *</Label>
                  <Textarea value={candidate.hrNotes} onChange={(e) => updateCandidate(candidate.id, "hrNotes", e.target.value)} placeholder="Parecer sobre o candidato" rows={6} required />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addCandidate} className="w-full mb-6 border-dashed border-2">
            <Plus className="h-4 w-4 mr-2" /> Adicionar outro candidato
          </Button>

          <div className="pt-2 pb-8">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[hsl(25,95%,53%)] hover:bg-[hsl(25,95%,45%)] text-white font-semibold py-3"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                `Enviar ${candidates.length > 1 ? `${candidates.length} Candidatos` : "Candidato"}`
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
