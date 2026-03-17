import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Search, CheckCircle, XCircle, FileText, Loader2, ExternalLink } from "lucide-react";
import logoSpread from "@/assets/logo-spread.jpg";

interface HunterCandidate {
  id: string;
  name: string;
  position: string | null;
  seniority: string | null;
  candidate_type: string | null;
  salary_expectation: string | null;
  hiring_model: string | null;
  hr_notes: string | null;
  cv_url: string | null;
  spread_cv_url: string | null;
  adherent: boolean | null;
  adherent_notes: string | null;
  hunter_name: string | null;
  hunter_email: string | null;
  created_at: string;
  hunter_link_id: string;
  job_title: string;
  job_client: string | null;
  link_created_at: string;
  recruiter_name: string | null;
  tags: { id: string; name: string }[];
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
  gestao: "Gestão",
};

const HIRING_MODEL_LABELS: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  cooperado: "Cooperado",
  temporario: "Temporário",
};

export default function HunterManagement() {
  const [candidates, setCandidates] = useState<HunterCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [evaluating, setEvaluating] = useState<HunterCandidate | null>(null);
  const [adherentValue, setAdherentValue] = useState<boolean | null>(null);
  const [adherentNotes, setAdherentNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      // Load hunter candidates with link and job info
      const { data: hcData, error } = await supabase
        .from("hunter_candidates" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!hcData || hcData.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      // Get all hunter_link_ids
      const linkIds = [...new Set((hcData as any[]).map((hc) => hc.hunter_link_id))];

      // Load hunter links
      const { data: linksData } = await supabase
        .from("hunter_links" as any)
        .select("id, job_id, created_by, created_at")
        .in("id", linkIds);

      // Get job ids and recruiter ids
      const jobIds = [...new Set((linksData || []).map((l: any) => l.job_id))];
      const recruiterIds = [...new Set((linksData || []).map((l: any) => l.created_by).filter(Boolean))];

      // Load jobs
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, client")
        .in("id", jobIds);

      // Load recruiter profiles
      let profilesMap: Record<string, string> = {};
      if (recruiterIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", recruiterIds);
        if (profilesData) {
          profilesData.forEach((p) => { profilesMap[p.id] = p.full_name; });
        }
      }

      // Load tags for all hunter candidates
      const hcIds = (hcData as any[]).map((hc) => hc.id);
      const { data: tagsData } = await supabase
        .from("hunter_candidate_tags" as any)
        .select("hunter_candidate_id, tag_id, tags(id, name)")
        .in("hunter_candidate_id", hcIds);

      const tagsMap: Record<string, { id: string; name: string }[]> = {};
      if (tagsData) {
        (tagsData as any[]).forEach((t) => {
          if (!tagsMap[t.hunter_candidate_id]) tagsMap[t.hunter_candidate_id] = [];
          if (t.tags) tagsMap[t.hunter_candidate_id].push(t.tags);
        });
      }

      // Build links map
      const linksMap: Record<string, any> = {};
      (linksData || []).forEach((l: any) => { linksMap[l.id] = l; });

      const jobsMap: Record<string, any> = {};
      (jobsData || []).forEach((j: any) => { jobsMap[j.id] = j; });

      // Combine data
      const combined: HunterCandidate[] = (hcData as any[]).map((hc) => {
        const link = linksMap[hc.hunter_link_id] || {};
        const job = jobsMap[link.job_id] || {};
        return {
          ...hc,
          job_title: job.title || "—",
          job_client: job.client || null,
          link_created_at: link.created_at || hc.created_at,
          recruiter_name: link.created_by ? profilesMap[link.created_by] || null : null,
          tags: tagsMap[hc.id] || [],
        };
      });

      setCandidates(combined);
    } catch (error: any) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEvaluation = (candidate: HunterCandidate) => {
    setEvaluating(candidate);
    setAdherentValue(candidate.adherent);
    setAdherentNotes(candidate.adherent_notes || "");
  };

  const saveEvaluation = async () => {
    if (!evaluating) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("hunter_candidates" as any)
        .update({
          adherent: adherentValue,
          adherent_notes: adherentNotes || null,
        } as any)
        .eq("id", evaluating.id);

      if (error) throw error;

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === evaluating.id
            ? { ...c, adherent: adherentValue, adherent_notes: adherentNotes || null }
            : c
        )
      );
      setEvaluating(null);
      toast({ title: "Avaliação salva!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getFileUrl = (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const filtered = candidates.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.job_title.toLowerCase().includes(term) ||
      c.recruiter_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <img src={logoSpread} alt="Spread Logo" className="h-8 w-auto" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Hunter</h2>
            <p className="text-muted-foreground mt-1">
              Candidatos indicados por hunters externos
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por candidato, vaga ou recrutadora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Nenhum candidato de hunter</h3>
              <p className="text-muted-foreground">
                {candidates.length === 0
                  ? "Nenhum candidato foi indicado por hunters ainda"
                  : "Nenhum resultado para esta busca"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Disparo</TableHead>
                    <TableHead>Envio</TableHead>
                    <TableHead>Recrutadora</TableHead>
                    <TableHead>Aderência</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.position && (
                            <p className="text-xs text-muted-foreground">{c.position}</p>
                          )}
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {c.seniority && (
                              <Badge variant="secondary" className="text-xs">
                                {SENIORITY_LABELS[c.seniority] || c.seniority}
                              </Badge>
                            )}
                            {c.hiring_model && (
                              <Badge variant="outline" className="text-xs">
                                {HIRING_MODEL_LABELS[c.hiring_model] || c.hiring_model}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{c.job_title}</p>
                        {c.job_client && (
                          <p className="text-xs text-muted-foreground">{c.job_client}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.link_created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.recruiter_name || "—"}
                      </TableCell>
                      <TableCell>
                        {c.adherent === true && (
                          <Badge className="bg-accent text-accent-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aderente
                          </Badge>
                        )}
                        {c.adherent === false && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Não Aderente
                          </Badge>
                        )}
                        {c.adherent === null && (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {c.cv_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getFileUrl("cvs", c.cv_url!), "_blank")}
                              title="CV Padrão"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {c.spread_cv_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getFileUrl("spread-cvs", c.spread_cv_url!), "_blank")}
                              title="CV Spread"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEvaluation(c)}
                          >
                            Avaliar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Evaluation Dialog */}
      <Dialog open={!!evaluating} onOpenChange={(open) => !open && setEvaluating(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Avaliar Candidato - {evaluating?.name}</DialogTitle>
          </DialogHeader>
          {evaluating && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p><strong>Vaga:</strong> {evaluating.job_title}</p>
                {evaluating.position && <p><strong>Cargo:</strong> {evaluating.position}</p>}
                {evaluating.salary_expectation && <p><strong>Pretensão:</strong> {evaluating.salary_expectation}</p>}
                {evaluating.hiring_model && (
                  <p><strong>Modelo:</strong> {HIRING_MODEL_LABELS[evaluating.hiring_model] || evaluating.hiring_model}</p>
                )}
                {evaluating.hr_notes && (
                  <div>
                    <strong>Parecer RH:</strong>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{evaluating.hr_notes}</p>
                  </div>
                )}
                {evaluating.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {evaluating.tags.map((t) => (
                      <Badge key={t.id} variant="outline" className="text-xs">#{t.name}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant={adherentValue === true ? "default" : "outline"}
                  className={adherentValue === true ? "bg-accent hover:bg-accent/90 text-accent-foreground flex-1" : "flex-1"}
                  onClick={() => setAdherentValue(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aderente
                </Button>
                <Button
                  variant={adherentValue === false ? "destructive" : "outline"}
                  className="flex-1"
                  onClick={() => setAdherentValue(false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Não Aderente
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={adherentNotes}
                  onChange={(e) => setAdherentNotes(e.target.value)}
                  placeholder="Notas sobre a aderência do candidato..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvaluating(null)}>Cancelar</Button>
            <Button onClick={saveEvaluation} disabled={saving || adherentValue === null}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
