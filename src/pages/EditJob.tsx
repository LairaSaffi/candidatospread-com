import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

export default function EditJob() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [client, setClient] = useState("");
  const [responsibleManager, setResponsibleManager] = useState("");
  const [spreadManagerId, setSpreadManagerId] = useState("");
  const [commercialResponsibleId, setCommercialResponsibleId] = useState("");
  const [recruiterResponsibleId, setRecruiterResponsibleId] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEditJobs } = useAuth();

  useEffect(() => {
    if (!canEditJobs) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar vagas.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    loadUsers();
    if (id) {
      loadJob();
    }
  }, [id, canEditJobs]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setTitle(data.title);
      setDescription(data.description || "");
      setWorkModel(data.work_model || "");
      setClient(data.client || "");
      setResponsibleManager(data.responsible_manager || "");
      setSpreadManagerId(data.spread_manager_id || "");
      setCommercialResponsibleId(data.commercial_responsible_id || "");
      setRecruiterResponsibleId(data.recruiter_responsible_id || "");
      setStatus(data.status);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar vaga",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("jobs")
        .update({
          title,
          description,
          work_model: workModel || null,
          client: client || null,
          responsible_manager: responsibleManager || null,
          spread_manager_id: spreadManagerId || null,
          commercial_responsible_id: commercialResponsibleId || null,
          recruiter_responsible_id: recruiterResponsibleId || null,
          status,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Vaga atualizada!",
        description: "A vaga foi atualizada com sucesso.",
      });

      navigate(`/jobs/${id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar vaga",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/jobs/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Editar Vaga</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Vaga *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Desenvolvedor Full Stack"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição da Vaga</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os requisitos e responsabilidades da vaga"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workModel">Modelo de Trabalho</Label>
                <Select value={workModel} onValueChange={setWorkModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Remoto">Remoto</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberta</SelectItem>
                    <SelectItem value="closed">Fechada</SelectItem>
                    <SelectItem value="on_hold">Em Espera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Input
                  id="client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsibleManager">Gestor Responsável (Cliente)</Label>
                <Input
                  id="responsibleManager"
                  value={responsibleManager}
                  onChange={(e) => setResponsibleManager(e.target.value)}
                  placeholder="Nome do gestor do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spreadManager">Gestor Spread</Label>
                <Select value={spreadManagerId} onValueChange={setSpreadManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercialResponsible">Responsável Comercial</Label>
                <Select value={commercialResponsibleId} onValueChange={setCommercialResponsibleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiterResponsible">Recrutador Responsável</Label>
                <Select value={recruiterResponsibleId} onValueChange={setRecruiterResponsibleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/jobs/${id}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
