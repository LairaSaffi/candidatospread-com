import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { openSignedFile } from "@/lib/storage";

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

interface TalentCandidate {
  id: string;
  name: string;
  seniority: string | null;
  cv_url: string | null;
  technical_test_url: string | null;
  hr_interview_notes: string | null;
  job_id: string;
  job_title: string;
  tags: Tag[];
}

export default function AvailableTalents() {
  const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
  const [filtered, setFiltered] = useState<TalentCandidate[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [candidates, searchTerm, seniorityFilter, tagFilter]);

  const loadData = async () => {
    try {
      const [candidatesResult, tagsResult] = await Promise.all([
        supabase
          .from("candidates")
          .select("id, name, seniority, cv_url, technical_test_url, hr_interview_notes, job_id, internal_status, jobs(title)")
          .eq("internal_status", "disponivel")
          .order("name"),
        supabase.from("tags").select("*").order("name"),
      ]);

      if (candidatesResult.error) throw candidatesResult.error;

      // Load tags for each candidate
      const candidateIds = candidatesResult.data?.map((c: any) => c.id) || [];
      let candidateTagsMap: Record<string, Tag[]> = {};

      if (candidateIds.length > 0) {
        const { data: ctData } = await supabase
          .from("candidate_tags")
          .select("candidate_id, tag_id, tags(id, name)")
          .in("candidate_id", candidateIds);

        if (ctData) {
          ctData.forEach((ct: any) => {
            if (!candidateTagsMap[ct.candidate_id]) candidateTagsMap[ct.candidate_id] = [];
            if (ct.tags) candidateTagsMap[ct.candidate_id].push(ct.tags);
          });
        }
      }

      const mapped: TalentCandidate[] = (candidatesResult.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        seniority: c.seniority,
        cv_url: c.cv_url,
        technical_test_url: c.technical_test_url,
        hr_interview_notes: c.hr_interview_notes,
        job_id: c.job_id,
        job_title: c.jobs?.title || "—",
        tags: candidateTagsMap[c.id] || [],
      }));

      setCandidates(mapped);
      if (tagsResult.data) setTags(tagsResult.data);
    } catch (error: any) {
      toast({ title: "Erro ao carregar talentos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...candidates];
    if (searchTerm) {
      result = result.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (seniorityFilter !== "all") {
      result = result.filter((c) => c.seniority === seniorityFilter);
    }
    if (tagFilter !== "all") {
      result = result.filter((c) => c.tags.some((t) => t.id === tagFilter));
    }
    setFiltered(result);
  };

  const handleOpenFile = async (type: "cv" | "test", filePath: string) => {
    setOpeningFile(type);
    try {
      if (filePath.startsWith("http")) {
        window.open(filePath, "_blank");
      } else {
        const bucket = type === "cv" ? "cvs" : "technical-tests";
        await openSignedFile(bucket, filePath);
      }
    } catch (error: any) {
      toast({ title: "Erro ao abrir arquivo", description: error.message, variant: "destructive" });
    } finally {
      setOpeningFile(null);
    }
  };

  const seniorityLabel = (value: string | null) => {
    return SENIORITY_OPTIONS.find((o) => o.value === value)?.label || "—";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Talentos Disponíveis
          </h2>
          <p className="text-muted-foreground mt-1">Candidatos disponíveis para alocação</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
              </div>
              <Select value={seniorityFilter} onValueChange={setSeniorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Senioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {SENIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>#{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando talentos...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum talento disponível</h3>
              <p className="text-muted-foreground">
                {candidates.length === 0 ? "Nenhum candidato com status 'Disponível'." : "Tente ajustar os filtros."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{c.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{seniorityLabel(c.seniority)}</Badge>
                    <span className="text-xs text-muted-foreground">Vaga: {c.job_title}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline" className="text-xs">#{tag.name}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {c.cv_url && (
                      <Button size="sm" variant="outline" onClick={() => handleOpenFile("cv", c.cv_url!)}>
                        <FileText className="h-3 w-3 mr-1" /> CV
                      </Button>
                    )}
                    {c.technical_test_url && (
                      <Button size="sm" variant="outline" onClick={() => handleOpenFile("test", c.technical_test_url!)}>
                        <FileText className="h-3 w-3 mr-1" /> Teste
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/jobs/${c.job_id}/candidates/${c.id}`)}>
                      Ver detalhes
                    </Button>
                  </div>
                  {c.hr_interview_notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.hr_interview_notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
