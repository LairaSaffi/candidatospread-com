import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { X, CheckCircle, Loader2 } from "lucide-react";
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
  { value: "cooperado", label: "Cooperado" },
  { value: "temporario", label: "Temporário" },
];

interface Tag {
  id: string;
  name: string;
}

interface JobInfo {
  id: string;
  title: string;
  client: string | null;
  description: string | null;
}

export default function HunterForm() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [hunterLinkId, setHunterLinkId] = useState("");
  const [job, setJob] = useState<JobInfo | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [seniority, setSeniority] = useState("");
  const [candidateType, setCandidateType] = useState("externo");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [hiringModel, setHiringModel] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [spreadCvFile, setSpreadCvFile] = useState<File | null>(null);

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

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hrNotes.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("hunter_token", token!);
      formData.append("name", name);
      if (position) formData.append("position", position);
      if (seniority) formData.append("seniority", seniority);
      formData.append("candidate_type", candidateType);
      if (salaryExpectation) formData.append("salary_expectation", salaryExpectation);
      if (hiringModel) formData.append("hiring_model", hiringModel);
      if (hrNotes) formData.append("hr_notes", hrNotes);
      if (selectedTags.length > 0) formData.append("tags", JSON.stringify(selectedTags));
      if (cvFile) formData.append("cv_file", cvFile);
      if (spreadCvFile) formData.append("spread_cv_file", spreadCvFile);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-hunter-candidate`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao enviar candidato");

      setSubmitted(true);
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPosition("");
    setSeniority("");
    setCandidateType("externo");
    setSalaryExpectation("");
    setHiringModel("");
    setHrNotes("");
    setSelectedTags([]);
    setCvFile(null);
    setSpreadCvFile(null);
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
            <h2 className="text-2xl font-semibold mb-2">Candidato enviado!</h2>
            <p className="text-muted-foreground mb-6">
              O candidato foi enviado com sucesso para avaliação da equipe.
            </p>
            <Button onClick={resetForm} className="bg-[hsl(25,95%,53%)] hover:bg-[hsl(25,95%,45%)] text-white">
              Enviar outro candidato
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
              {job.client && <CardDescription>Cliente: {job.client}</CardDescription>}
            </CardHeader>
            {job.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            )}
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Indicar Candidato</CardTitle>
            <CardDescription>Preencha os dados do candidato para esta vaga</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do candidato" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ex: Desenvolvedor Full Stack" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={candidateType} onValueChange={setCandidateType}>
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
                  <Select value={seniority} onValueChange={setSeniority}>
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
                <Select value={hiringModel} onValueChange={setHiringModel}>
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
                <Label htmlFor="salaryExpectation">Pretensão Salarial</Label>
                <Input id="salaryExpectation" value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder="Ex: R$ 8.000 - R$ 10.000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv">CV Padrão (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Input id="cv" type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                  {cvFile && <Button type="button" variant="ghost" size="sm" onClick={() => setCvFile(null)}>Remover</Button>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spreadCv">CV Modelo Spread (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Input id="spreadCv" type="file" accept=".pdf" onChange={(e) => setSpreadCvFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                  {spreadCvFile && <Button type="button" variant="ghost" size="sm" onClick={() => setSpreadCvFile(null)}>Remover</Button>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hrNotes">Parecer RH *</Label>
                <Textarea id="hrNotes" value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} placeholder="Parecer sobre o candidato" rows={6} required />
              </div>

              <div className="pt-4">
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
                    "Enviar Candidato"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
