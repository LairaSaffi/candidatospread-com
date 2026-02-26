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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X } from "lucide-react";

const SENIORITY_OPTIONS = [
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "gestao", label: "Gestão" },
];

interface Tag {
  id: string;
  name: string;
}

export default function NewCandidate() {
  const { jobId } = useParams();
  const [name, setName] = useState("");
  const [seniority, setSeniority] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
          job_id: jobId,
          name,
          seniority: seniority || null,
          hr_interview_notes: hrNotes || null,
          status: "pending",
        })
        .select()
        .single();

      if (candidateError) throw candidateError;

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
      navigate(`/jobs/${jobId}`);
    } catch (error: any) {
      toast({ title: "Erro ao adicionar candidato", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${jobId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Adicionar Candidato</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do candidato" required />
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
                <Label htmlFor="hrNotes">Parecer RH</Label>
                <Textarea id="hrNotes" value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} placeholder="Parecer do RH sobre o candidato" rows={6} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(`/jobs/${jobId}`)} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1">{loading ? "Salvando..." : "Adicionar Candidato"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
