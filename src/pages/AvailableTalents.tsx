import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Search, Users, Share2, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { openSignedFile } from "@/lib/storage";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";

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
  tags: Tag[];
}

export default function AvailableTalents() {
  const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
  const [filtered, setFiltered] = useState<TalentCandidate[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [generatingBulkLink, setGeneratingBulkLink] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [candidates, searchTerm, seniorityFilter, selectedTags]);

  const loadData = async () => {
    try {
      const [candidatesResult, tagsResult] = await Promise.all([
        supabase
          .from("candidates")
          .select("id, name, seniority, cv_url, technical_test_url, hr_interview_notes, job_id, internal_status")
          .eq("internal_status", "disponivel")
          .order("name"),
        supabase.from("tags").select("*").order("name"),
      ]);

      if (candidatesResult.error) throw candidatesResult.error;

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
    if (selectedTags.length > 0) {
      result = result.filter((c) => selectedTags.every((tagId) => c.tags.some((t) => t.id === tagId)));
    }
    setFiltered(result);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
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

  const handleGenerateLink = async (candidateId: string) => {
    setGeneratingLink(candidateId);
    try {
      const { data: existing } = await supabase
        .from("candidate_share_links" as any)
        .select("share_token")
        .eq("candidate_id", candidateId)
        .limit(1)
        .maybeSingle();

      let token: string;
      if ((existing as any)?.share_token) {
        token = (existing as any).share_token;
      } else {
        const { data: newLink, error } = await supabase
          .from("candidate_share_links" as any)
          .insert({ candidate_id: candidateId, created_by: user?.id } as any)
          .select("share_token")
          .single();
        if (error) throw error;
        token = (newLink as any).share_token;
      }

      const url = `${window.location.origin}/candidate/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(candidateId);
      setTimeout(() => setCopiedId(null), 3000);
      toast({ title: "Link copiado!", description: "O link do candidato foi copiado para a área de transferência." });
    } catch (error: any) {
      toast({ title: "Erro ao gerar link", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingLink(null);
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  };

  const handleGenerateBulkLink = async () => {
    if (selectedCandidates.length === 0) return;
    setGeneratingBulkLink(true);
    try {
      const { data: linkData, error: linkError } = await supabase
        .from("talent_share_links" as any)
        .insert({ created_by: user?.id } as any)
        .select("id, share_token")
        .single();
      if (linkError) throw linkError;

      const rows = selectedCandidates.map((cid) => ({
        talent_share_link_id: (linkData as any).id,
        candidate_id: cid,
      }));

      const { error: insertError } = await supabase
        .from("talent_share_candidates" as any)
        .insert(rows as any);
      if (insertError) throw insertError;

      const url = `${window.location.origin}/talents/${(linkData as any).share_token}`;
      await navigator.clipboard.writeText(url);
      setSelectedCandidates([]);
      toast({
        title: "Link copiado!",
        description: `Link com ${rows.length} talento${rows.length > 1 ? "s" : ""} copiado para a área de transferência.`,
      });
    } catch (error: any) {
      toast({ title: "Erro ao gerar link", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingBulkLink(false);
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[220px] justify-start">
                    {selectedTags.length === 0
                      ? "Filtrar por tags..."
                      : `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selecionada${selectedTags.length > 1 ? "s" : ""}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-2" align="start">
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={() => toggleTag(tag.id)}
                        />
                        #{tag.name}
                      </label>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedTags([])}
                    >
                      Limpar filtro
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
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
          <>
            {/* Bulk action bar */}
            {selectedCandidates.length > 0 && (
              <div className="mb-4 flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-sm font-medium">
                  {selectedCandidates.length} talento{selectedCandidates.length > 1 ? "s" : ""} selecionado{selectedCandidates.length > 1 ? "s" : ""}
                </span>
                <Button
                  size="sm"
                  onClick={handleGenerateBulkLink}
                  disabled={generatingBulkLink}
                >
                  {generatingBulkLink ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Share2 className="h-3 w-3 mr-1" />
                  )}
                  Gerar Link com Selecionados
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCandidates([])}
                >
                  Limpar seleção
                </Button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <Card
                  key={c.id}
                  className={`hover:shadow-lg transition-shadow ${selectedCandidates.includes(c.id) ? "ring-2 ring-primary" : ""}`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedCandidates.includes(c.id)}
                        onCheckedChange={() => toggleCandidateSelection(c.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-xl">{c.name}</CardTitle>
                        {c.seniority && (
                          <div className="mt-1">
                            <Badge variant="secondary">Senioridade: {seniorityLabel(c.seniority)}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {c.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((tag) => (
                            <Badge key={tag.id} variant="outline" className="text-xs">#{tag.name}</Badge>
                          ))}
                        </div>
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
                      <Button
                        size="sm"
                        variant={copiedId === c.id ? "default" : "outline"}
                        onClick={() => handleGenerateLink(c.id)}
                        disabled={generatingLink === c.id}
                      >
                        {generatingLink === c.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : copiedId === c.id ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Share2 className="h-3 w-3 mr-1" />
                        )}
                        {copiedId === c.id ? "Copiado!" : "Link"}
                      </Button>
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
          </>
        )}
      </main>
    </div>
  );
}
