import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Users, LogOut, Link as LinkIcon, Search, Settings, Filter, Tag, Star } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import logoSpread from "@/assets/logo-spread.jpg";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Job {
  id: string;
  title: string;
  client: string | null;
  status: "open" | "closed" | "on_hold";
  created_at: string;
  candidate_count?: number;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  gestao_operacao: "Gestão da Operação",
};

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [clients, setClients] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, roles, isAdmin, canCreateJobs, canEditJobs, signOut } = useAuth();

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, statusFilter, clientFilter]);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          candidates(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const jobsWithCount = data?.map((job: any) => ({
        ...job,
        candidate_count: job.candidates?.[0]?.count || 0,
      }));

      setJobs(jobsWithCount || []);

      // Extrair clientes únicos para filtro
      const uniqueClients = [...new Set(
        data
          ?.map((job: any) => job.client)
          .filter((client: string | null): client is string => Boolean(client))
      )];
      setClients(uniqueClients);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar vagas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    if (searchTerm) {
      filtered = filtered.filter((job) =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.client?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    if (clientFilter !== "all") {
      filtered = filtered.filter((job) => job.client === clientFilter);
    }

    setFilteredJobs(filtered);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const copyEvaluationLink = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: existingLink } = await supabase
        .from("job_evaluation_links")
        .select("evaluator_token")
        .eq("job_id", jobId)
        .maybeSingle();

      let token = existingLink?.evaluator_token;

      if (!token) {
        const { data: newLink, error } = await supabase
          .from("job_evaluation_links")
          .insert({ job_id: jobId })
          .select("evaluator_token")
          .single();

        if (error) throw error;
        token = newLink.evaluator_token;
      }

      const link = `${window.location.origin}/evaluate/${token}`;
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copiado!",
        description: "O link de avaliação foi copiado para a área de transferência.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao copiar link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoSpread} alt="Spread Logo" className="h-8 w-auto" />
            <h1 className="text-xl font-bold">Talent on Demand</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {profile?.full_name}
              </span>
              <Badge variant="secondary" className="text-xs">
                {roles.map((r) => roleLabels[r]).join(", ")}
              </Badge>
            </div>
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/admin/candidates")}>
                  <Users className="h-4 w-4 mr-2" />
                  Candidatos
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/admin/tags")}>
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Usuários
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/talents")}>
              <Star className="h-4 w-4 mr-2" />
              Talentos
            </Button>
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Oportunidades Ativas</h2>
            <p className="text-muted-foreground mt-1">
              Painel de gestão dos candidatos disponibilizados aos clientes
            </p>
          </div>
          {canCreateJobs && (
            <Button onClick={() => navigate("/jobs/new")} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Vaga
            </Button>
          )}
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou cliente..."
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
                  <SelectItem value="open">Abertas</SelectItem>
                  <SelectItem value="closed">Fechadas</SelectItem>
                  <SelectItem value="on_hold">Em espera</SelectItem>
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

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando vagas...
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {jobs.length === 0 ? "Nenhuma vaga cadastrada" : "Nenhuma vaga encontrada"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {jobs.length === 0
                  ? "Comece criando sua primeira vaga"
                  : "Tente ajustar os filtros de busca"}
              </p>
              {canCreateJobs && jobs.length === 0 && (
                <Button onClick={() => navigate("/jobs/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Vaga
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      {job.client && (
                        <CardDescription className="mt-1">
                          {job.client}
                        </CardDescription>
                      )}
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{job.candidate_count} candidatos</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => copyEvaluationLink(job.id, e)}
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Copiar Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
