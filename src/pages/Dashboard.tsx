import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Briefcase, Users, LogOut, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface Job {
  id: string;
  title: string;
  department: string | null;
  status: "open" | "closed" | "on_hold";
  created_at: string;
  candidate_count?: number;
}
export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadJobs();
  }, []);
  const loadJobs = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("jobs").select(`
          *,
          candidates(count)
        `).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      const jobsWithCount = data?.map((job: any) => ({
        ...job,
        candidate_count: job.candidates?.[0]?.count || 0
      }));
      setJobs(jobsWithCount || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar vagas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  return <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-violet-900" />
            <h1 className="text-xl font-bold">Hub de Talentos</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Oportunidades Ativas</h2>
            <p className="text-muted-foreground mt-1">Painel de gestão dos candidatos disponibilizados aos clientes</p>
          </div>
          <Button onClick={() => navigate("/jobs/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        </div>

        {loading ? <div className="text-center py-12 text-muted-foreground">
            Carregando vagas...
          </div> : jobs.length === 0 ? <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma vaga cadastrada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira vaga
              </p>
              <Button onClick={() => navigate("/jobs/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Vaga
              </Button>
            </CardContent>
          </Card> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map(job => <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl bg-muted-foreground">{job.title}</CardTitle>
                      {job.department && <CardDescription className="mt-1">
                          {job.department}
                        </CardDescription>}
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{job.candidate_count} candidatos</span>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </main>
    </div>;
}