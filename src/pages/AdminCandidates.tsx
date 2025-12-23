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
  created_at: string;
  job_id: string;
  job_title: string;
  client: string | null;
  responsible_manager: string | null;
  recruiter_name: string | null;
  evaluation_decision: string | null;
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

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState<CandidateWithDetails[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
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
  }, [candidates, searchTerm, statusFilter, clientFilter]);

  const loadCandidates = async () => {
    try {
      // Buscar candidatos com informações da vaga
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select(`
          id,
          name,
          status,
          created_at,
          job_id,
          jobs (
            title,
            client,
            responsible_manager,
            recruiter_responsible_id
          )
        `)
        .order("created_at", { ascending: false });

      if (candidatesError) throw candidatesError;

      // Buscar perfis dos recrutadores
      const recruiterIds = candidatesData
        ?.map((c: any) => c.jobs?.recruiter_responsible_id)
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
      const candidateIds = candidatesData?.map((c: any) => c.id) || [];
      let evaluations: Record<string, string> = {};
      
      if (candidateIds.length > 0) {
        const { data: evaluationsData } = await supabase
          .from("candidate_evaluations")
          .select("candidate_id, decision")
          .in("candidate_id", candidateIds)
          .not("decision", "is", null);

        if (evaluationsData) {
          evaluations = evaluationsData.reduce((acc: Record<string, string>, e) => {
            acc[e.candidate_id] = e.decision!;
            return acc;
          }, {});
        }
      }

      // Montar dados finais
      const formattedCandidates: CandidateWithDetails[] = candidatesData?.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        created_at: c.created_at,
        job_id: c.job_id,
        job_title: c.jobs?.title || "Vaga não encontrada",
        client: c.jobs?.client || null,
        responsible_manager: c.jobs?.responsible_manager || null,
        recruiter_name: c.jobs?.recruiter_responsible_id 
          ? recruiterProfiles[c.jobs.recruiter_responsible_id] || null 
          : null,
        evaluation_decision: evaluations[c.id] || null,
      })) || [];

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
        "Cliente",
        "Gestor Responsável",
        "Recrutador",
        "Data de Envio",
        "Status Avaliação",
      ];

      const rows = filteredCandidates.map((c) => [
        c.name,
        c.job_title,
        c.client || "-",
        c.responsible_manager || "-",
        c.recruiter_name || "-",
        format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR }),
        c.evaluation_decision 
          ? evaluationLabels[c.evaluation_decision] || c.evaluation_decision
          : statusLabels[c.status] || c.status,
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
                      <TableHead>Cliente</TableHead>
                      <TableHead>Gestor Responsável</TableHead>
                      <TableHead>Recrutador</TableHead>
                      <TableHead>Data de Envio</TableHead>
                      <TableHead>Status Avaliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => (
                      <TableRow 
                        key={candidate.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/jobs/${candidate.job_id}/candidates/${candidate.id}`)}
                      >
                        <TableCell className="font-medium">{candidate.name}</TableCell>
                        <TableCell>{candidate.job_title}</TableCell>
                        <TableCell>{candidate.client || "-"}</TableCell>
                        <TableCell>{candidate.responsible_manager || "-"}</TableCell>
                        <TableCell>{candidate.recruiter_name || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(candidate.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {candidate.evaluation_decision 
                            ? getEvaluationBadge(candidate.evaluation_decision)
                            : getStatusBadge(candidate.status)
                          }
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
