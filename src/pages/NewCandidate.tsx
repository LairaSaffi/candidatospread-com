import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X, Search, UserPlus, Link2, Loader2 } from "lucide-react";

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

interface Tag {
  id: string;
  name: string;
}

interface ExistingCandidate {
  id: string;
  name: string;
  seniority: string | null;
  candidate_type: string | null;
  tags: Tag[];
}

export default function NewCandidate() {
  const { jobId } = useParams();
  const [name, setName] = useState("");
  const [seniority, setSeniority] = useState("");
  const [candidateType, setCandidateType] = useState("externo");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Talent search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ExistingCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setTags(data);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const uploadFile = async (file: File, bucket: string, candidateId: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${candidateId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) throw uploadError;
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .insert({
          job_id: jobId || null,
          name,
          seniority: seniority || null,
          candidate_type: candidateType,
          salary_expectation: salaryExpectation.trim() || null,
          hr_interview_notes: hrNotes || null,
          status: "pending",
        } as any)
        .select()
        .single();

      if (candidateError) throw candidateError;

      // If linked to a job, also create candidate_jobs entry
      if (jobId) {
        const { error: linkError } = await supabase
          .from("candidate_jobs" as any)
          .insert({ candidate_id: candidate.id, job_id: jobId } as any);
        if (linkError) throw linkError;
      }

      let cvUrl = null;
      let testUrl = null;

      if (cvFile) cvUrl = await uploadFile(cvFile, "cvs", candidate.id);
      if (testFile) testUrl = await uploadFile(testFile, "technical-tests", candidate.id);

      if (cvUrl || testUrl) {
        const { error: updateError } = await supabase
          .from("candidates")
          .update({ cv_url: cvUrl, technical_test_url: testUrl })
          .eq("id", candidate.id);
        if (updateError) throw updateError;
      }

      // Save tags
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map((tagId) => ({
          candidate_id: candidate.id,
          tag_id: tagId,
        }));
        const { error: tagError } = await supabase.from("candidate_tags").insert(tagInserts);
        if (tagError) throw tagError;
      }

      toast({ title: "Candidato adicionado!", description: "O candidato foi adicionado com sucesso." });
      if (jobId) {
        navigate(`/jobs/${jobId}`);
      } else {
        navigate("/talents");
      }
    } catch (error: any) {
      toast({ title: "Erro ao adicionar candidato", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTalents = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, name, seniority, candidate_type")
        .ilike("name", `%${searchTerm}%`)
        .order("name")
        .limit(20);

      if (error) throw error;

      // Get tags for results
      const ids = data?.map((c) => c.id) || [];
      let tagsMap: Record<string, Tag[]> = {};
      if (ids.length > 0) {
        const { data: ctData } = await supabase
          .from("candidate_tags")
          .select("candidate_id, tags(id, name)")
          .in("candidate_id", ids);
        if (ctData) {
          ctData.forEach((ct: any) => {
            if (!tagsMap[ct.candidate_id]) tagsMap[ct.candidate_id] = [];
            if (ct.tags) tagsMap[ct.candidate_id].push(ct.tags);
          });
        }
      }

      // Check which are already linked to this job
      let linkedIds: string[] = [];
      if (jobId && ids.length > 0) {
        const { data: linked } = await supabase
          .from("candidate_jobs" as any)
          .select("candidate_id")
          .eq("job_id", jobId)
          .in("candidate_id", ids);
        linkedIds = (linked || []).map((l: any) => l.candidate_id);
      }

      setSearchResults(
        (data || [])
          .filter((c) => !linkedIds.includes(c.id))
          .map((c) => ({
            ...c,
            candidate_type: (c as any).candidate_type,
            tags: tagsMap[c.id] || [],
          }))
      );
    } catch (error: any) {
      toast({ title: "Erro na busca", description: error.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleLinkTalent = async (candidateId: string) => {
    if (!jobId) return;
    setLinking(candidateId);
    try {
      const { error } = await supabase
        .from("candidate_jobs" as any)
        .insert({ candidate_id: candidateId, job_id: jobId } as any);
      if (error) throw error;

      toast({ title: "Talento vinculado!", description: "O candidato foi vinculado à vaga com sucesso." });
      navigate(`/jobs/${jobId}`);
    } catch (error: any) {
      toast({ title: "Erro ao vincular", description: error.message, variant: "destructive" });
    } finally {
      setLinking(null);
    }
  };

  const goBack = () => {
    if (jobId) navigate(`/jobs/${jobId}`);
    else navigate("/talents");
  };

  const candidateForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do candidato" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo *</Label>
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
          <Label>Senioridade</Label>
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
        <Label htmlFor="salaryExpectation">Pretensão Salarial</Label>
        <Input id="salaryExpectation" value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder="Ex: R$ 8.000 - R$ 10.000" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cv">Anexo do CV (PDF)</Label>
        <div className="flex items-center gap-2">
          <Input id="cv" type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} className="cursor-pointer" />
          {cvFile && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCvFile(null)}>Remover</Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="test">Anexo de Teste Técnico (PDF)</Label>
        <div className="flex items-center gap-2">
          <Input id="test" type="file" accept=".pdf" onChange={(e) => setTestFile(e.target.files?.[0] || null)} className="cursor-pointer" />
          {testFile && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setTestFile(null)}>Remover</Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hrNotes">Parecer RH *</Label>
        <Textarea id="hrNotes" value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} placeholder="Parecer do RH sobre o candidato" rows={6} required />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={goBack} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={loading} className="flex-1">{loading ? "Salvando..." : "Adicionar Candidato"}</Button>
      </div>
    </form>
  );

  const talentSearchContent = (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar talento por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchTalents()}
        />
        <Button onClick={handleSearchTalents} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
              <div>
                <p className="font-medium">{c.name}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {c.candidate_type && (
                    <Badge variant="outline" className="text-xs">
                      {c.candidate_type === "interno" ? "Interno" : "Externo"}
                    </Badge>
                  )}
                  {c.seniority && (
                    <Badge variant="secondary" className="text-xs">
                      {SENIORITY_OPTIONS.find((o) => o.value === c.seniority)?.label || c.seniority}
                    </Badge>
                  )}
                  {c.tags.map((t) => (
                    <Badge key={t.id} variant="outline" className="text-xs">#{t.name}</Badge>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleLinkTalent(c.id)}
                disabled={linking === c.id}
              >
                {linking === c.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Link2 className="h-4 w-4 mr-1" />
                )}
                Vincular
              </Button>
            </div>
          ))}
        </div>
      ) : searchTerm && !searching ? (
        <p className="text-center text-muted-foreground py-8">Nenhum talento encontrado</p>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Busque um talento pelo nome para vinculá-lo a esta vaga
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {jobId ? "Adicionar Candidato à Vaga" : "Cadastrar Talento"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobId ? (
              <Tabs defaultValue="new">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="new" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Candidato
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex-1">
                    <Search className="h-4 w-4 mr-2" />
                    Vincular Talento
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="new">{candidateForm}</TabsContent>
                <TabsContent value="search">{talentSearchContent}</TabsContent>
              </Tabs>
            ) : (
              candidateForm
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
