import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Search, Filter, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CandidateWithDetails {
  id: string;
  name: string;
  status: string;
  salary_expectation: string | null;
  created_at: string;
  job_id: string;
  job_title: string;
  job_status: string | null;
  client: string | null;
  responsible_manager: string | null;
  recruiter_name: string | null;
  evaluation_decision: string | null;
  evaluated_by_user_id: string | null;
  evaluator_name: string | null;
  evaluated_at: string | null;
  evaluation_justification: string | null;
  interview_schedule_options: string | null;
}



const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  interview_scheduled: "Entrevista Agendada",
};

const evaluationLabels: Record<string, string> = {
  interested: "Interessado",
  rejected: "Não Aprovado",
};

const jobStatusLabels: Record<string, string> = {
  open: "Aberta",
  cancelled: "Cancelada",
  lost: "Perdida",
  completed: "Concluída",
};

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState<CandidateWithDetails[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [clients, setClients] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (!authLoading && isAdmin) {
      loadCandidates();
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    filterCandidates();
  }, [candidates, searchTerm, statusFilter, clientFilter, jobStatusFilter]);

  const loadCandidates = async () => {
    try {
      // Buscar todos os candidatos
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select(`id, name, status, salary_expectation, created_at, job_id`)
        .order("created_at", { ascending: false });

      if (candidatesError) throw candidatesError;

      const candidateIds = candidatesData?.map((c: any) => c.id) || [];

      // Buscar relação N:N candidate_jobs
      let candidateJobs: { candidate_id: string; job_id: string }[] = [];
      if (candidateIds.length > 0) {
        const { data: cjData } = await supabase
          .from("candidate_jobs")
          .select("candidate_id, job_id")
          .in("candidate_id", candidateIds);
        candidateJobs = cjData || [];
      }

      // Conjunto de job_ids para buscar info das vagas
      const jobIdsSet = new Set<string>();
      candidateJobs.forEach((cj) => jobIdsSet.add(cj.job_id));
      candidatesData?.forEach((c: any) => {
        if (c.job_id) jobIdsSet.add(c.job_id);
      });

      let jobsMap: Record<string, any> = {};
      if (jobIdsSet.size > 0) {
        const { data: jobsData } = await supabase
          .from("jobs")
          .select("id, title, client, status, responsible_manager, recruiter_responsible_id")
          .in("id", Array.from(jobIdsSet));
        if (jobsData) {
          jobsMap = jobsData.reduce((acc: Record<string, any>, j: any) => {
            acc[j.id] = j;
            return acc;
          }, {});
        }
      }

      // Buscar perfis dos recrutadores
      const recruiterIds = Object.values(jobsMap)
        .map((j: any) => j.recruiter_responsible_id)
        .filter((id: string | null): id is string => Boolean(id));
      const uniqueRecruiterIds = [...new Set(recruiterIds)];

      let recruiterProfiles: Record<string, string> = {};
      if (uniqueRecruiterIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", uniqueRecruiterIds);

        if (profilesData) {
          recruiterProfiles = profilesData.reduce((acc: Record<string, string>, p) => {
            acc[p.id] = p.full_name;
            return acc;
          }, {});
        }
      }

      // Buscar avaliações dos candidatos
      let evaluations: Record<string, { decision: string; evaluated_by_user_id: string | null; evaluated_at: string | null; justification: string | null; interview_schedule_options: string | null }> = {};
      
      if (candidateIds.length > 0) {
        const { data: evaluationsData } = await supabase
          .from("candidate_evaluations")
          .select("candidate_id, decision, evaluated_by_user_id, evaluated_at, created_at, justification, interview_schedule_options")
          .in("candidate_id", candidateIds)
          .not("decision", "is", null);

        if (evaluationsData) {
          evaluations = evaluationsData.reduce((acc: Record<string, { decision: string; evaluated_by_user_id: string | null; evaluated_at: string | null; justification: string | null; interview_schedule_options: string | null }>, e) => {
            acc[e.candidate_id] = { 
              decision: e.decision!, 
              evaluated_by_user_id: e.evaluated_by_user_id,
              evaluated_at: (e as any).evaluated_at || (e as any).created_at || null,
              justification: (e as any).justification || null,
              interview_schedule_options: (e as any).interview_schedule_options || null,
            };
            return acc;
          }, {});
        }
      }


      // Buscar nomes dos avaliadores internos
      const evaluatorIds = Object.values(evaluations)
        .map((e) => e.evaluated_by_user_id)
        .filter((id): id is string => Boolean(id));
      
      const uniqueEvaluatorIds = [...new Set(evaluatorIds)];
      let evaluatorProfiles: Record<string, string> = {};
      
      if (uniqueEvaluatorIds.length > 0) {
        const { data: evalProfilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", uniqueEvaluatorIds);

        if (evalProfilesData) {
          evaluatorProfiles = evalProfilesData.reduce((acc: Record<string, string>, p) => {
            acc[p.id] = p.full_name;
            return acc;
          }, {});
        }
      }

      // Montar dados finais (expandindo candidatos com múltiplas vagas)
      const candidateJobsByCandidate: Record<string, string[]> = {};
      candidateJobs.forEach((cj) => {
        if (!candidateJobsByCandidate[cj.candidate_id]) candidateJobsByCandidate[cj.candidate_id] = [];
        candidateJobsByCandidate[cj.candidate_id].push(cj.job_id);
      });

      const buildRow = (c: any, jobId: string | null): CandidateWithDetails => {
        const job = jobId ? jobsMap[jobId] : null;
        const evalData = evaluations[c.id];
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          salary_expectation: c.salary_expectation || null,
          created_at: c.created_at,
          job_id: jobId || "",
          job_title: job?.title || "Sem vaga vinculada",
          job_status: job?.status || null,
          client: job?.client || null,
          responsible_manager: job?.responsible_manager || null,
          recruiter_name: job?.recruiter_responsible_id
            ? recruiterProfiles[job.recruiter_responsible_id] || null
            : null,
          evaluation_decision: evalData?.decision || null,
          evaluated_by_user_id: evalData?.evaluated_by_user_id || null,
          evaluator_name: evalData?.evaluated_by_user_id
            ? evaluatorProfiles[evalData.evaluated_by_user_id] || null
            : null,
          evaluated_at: evalData?.evaluated_at || null,
          evaluation_justification: evalData?.justification || null,
          interview_schedule_options: evalData?.interview_schedule_options || null,
        };
      };

      const formattedCandidates: CandidateWithDetails[] = [];
      candidatesData?.forEach((c: any) => {
        const linkedJobs = candidateJobsByCandidate[c.id] || [];
        if (linkedJobs.length === 0) {
          formattedCandidates.push(buildRow(c, c.job_id || null));
        } else {
          linkedJobs.forEach((jobId) => {
            formattedCandidates.push(buildRow(c, jobId));
          });
        }
      });

      setCandidates(formattedCandidates);

      // Extrair clientes únicos para filtro
      const uniqueClients = [...new Set(
        formattedCandidates
          .map((c) => c.client)
          .filter((client): client is string => Boolean(client))
      )];
      setClients(uniqueClients);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar candidatos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCandidates = () => {
    let filtered = [...candidates];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(term) ||
        c.job_title.toLowerCase().includes(term) ||
        c.client?.toLowerCase().includes(term) ||
        c.responsible_manager?.toLowerCase().includes(term) ||
        c.recruiter_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (clientFilter !== "all") {
      filtered = filtered.filter((c) => c.client === clientFilter);
    }

    if (jobStatusFilter !== "all") {
      filtered = filtered.filter((c) => c.job_status === jobStatusFilter);
    }

    setFilteredCandidates(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      interview_scheduled: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getEvaluationBadge = (decision: string | null) => {
    if (!decision) return <span className="text-muted-foreground">-</span>;
    
    const variants: Record<string, "default" | "destructive"> = {
      interested: "default",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[decision] || "secondary"}>
        {evaluationLabels[decision] || decision}
      </Badge>
    );
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Criar conteúdo CSV
      const headers = [
        "Nome do Candidato",
        "Nome da Vaga",
        "Status da Vaga",
        "Cliente",
        "Gestor Responsável",
        "Recrutador",
        "Pretensão Salarial",
        "Data de Envio",
        "Status Avaliação",
        "Avaliado por",
        "Data Avaliação",
        "Feedback do Cliente",
      ];


      const rows = filteredCandidates.map((c) => [
        c.name,
        c.job_title,
        c.job_status ? jobStatusLabels[c.job_status] || c.job_status : "-",
        c.client || "-",
        c.responsible_manager || "-",
        c.recruiter_name || "-",
        c.salary_expectation || "-",
        format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR }),
        c.evaluation_decision 
          ? evaluationLabels[c.evaluation_decision] || c.evaluation_decision
          : statusLabels[c.status] || c.status,
        c.evaluated_by_user_id 
          ? (c.evaluator_name || "Usuário interno")
          : (c.evaluation_decision ? "Link externo" : "-"),
        c.evaluated_at ? format(new Date(c.evaluated_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
        c.evaluation_justification || "-",
      ]);


      // Montar CSV com BOM para UTF-8
      const BOM = "\uFEFF";
      const csvContent = BOM + [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      ].join("\n");

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `candidatos_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: `${filteredCandidates.length} candidatos exportados com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Lista de Candidatos</h1>
            <p className="text-muted-foreground mt-1">
              Visualize todos os candidatos e exporte para Excel
            </p>
          </div>
          <Button onClick={exportToExcel} disabled={exporting || filteredCandidates.length === 0}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar Excel
          </Button>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por candidato, vaga, cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="interview_scheduled">Entrevista Agendada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status da Vaga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="lost">Perdida</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Candidatos ({filteredCandidates.length})
            </CardTitle>
            <CardDescription>
              Lista completa de candidatos vinculados às vagas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum candidato encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Candidato</TableHead>
                      <TableHead>Nome da Vaga</TableHead>
                      <TableHead>Status da Vaga</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Gestor Responsável</TableHead>
                      <TableHead>Recrutador</TableHead>
                      <TableHead>Pretensão</TableHead>
                      <TableHead>Data de Envio</TableHead>
                      <TableHead>Status Avaliação</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data Avaliação</TableHead>
                      <TableHead>Feedback do Cliente</TableHead>
                    </TableRow>

                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => (
                      <TableRow 
                        key={`${candidate.id}-${candidate.job_id || "none"}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => candidate.job_id ? navigate(`/jobs/${candidate.job_id}/candidates/${candidate.id}`) : navigate(`/candidates/${candidate.id}`)}
                      >
                        <TableCell className="font-medium">{candidate.name}</TableCell>
                        <TableCell>{candidate.job_title}</TableCell>
                        <TableCell>
                          {candidate.job_status ? (
                            <Badge variant="outline">{jobStatusLabels[candidate.job_status] || candidate.job_status}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{candidate.client || "-"}</TableCell>
                        <TableCell>{candidate.responsible_manager || "-"}</TableCell>
                        <TableCell>{candidate.recruiter_name || "-"}</TableCell>
                        <TableCell>{candidate.salary_expectation || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(candidate.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {candidate.evaluation_decision 
                            ? getEvaluationBadge(candidate.evaluation_decision)
                            : getStatusBadge(candidate.status)
                          }
                        </TableCell>
                        <TableCell>
                          {candidate.evaluated_by_user_id ? (
                            <span className="text-sm">{candidate.evaluator_name || "Usuário interno"}</span>
                          ) : candidate.evaluation_decision ? (
                            <span className="text-sm text-muted-foreground">Link externo</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {candidate.evaluated_at ? (
                            <span className="text-sm">{format(new Date(candidate.evaluated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {candidate.evaluation_justification ? (
                            <span 
                              className="text-sm line-clamp-2 max-w-[200px] cursor-help" 
                              title={candidate.evaluation_justification}
                            >
                              {candidate.evaluation_justification}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>

                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
