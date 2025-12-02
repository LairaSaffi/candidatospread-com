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
import { ArrowLeft } from "lucide-react";

export default function EditJob() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [client, setClient] = useState("");
  const [responsibleManager, setResponsibleManager] = useState("");
  const [spreadManager, setSpreadManager] = useState("");
  const [commercialResponsible, setCommercialResponsible] = useState("");
  const [recruiterResponsible, setRecruiterResponsible] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadJob();
    }
  }, [id]);

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
      setSpreadManager(data.spread_manager || "");
      setCommercialResponsible(data.commercial_responsible || "");
      setRecruiterResponsible(data.recruiter_responsible || "");
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
          spread_manager: spreadManager || null,
          commercial_responsible: commercialResponsible || null,
          recruiter_responsible: recruiterResponsible || null,
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
                <Label htmlFor="responsibleManager">Gestor Responsável</Label>
                <Input
                  id="responsibleManager"
                  value={responsibleManager}
                  onChange={(e) => setResponsibleManager(e.target.value)}
                  placeholder="Nome do gestor responsável"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spreadManager">Gestor Spread</Label>
                <Input
                  id="spreadManager"
                  value={spreadManager}
                  onChange={(e) => setSpreadManager(e.target.value)}
                  placeholder="Nome do gestor Spread"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercialResponsible">Responsável Comercial</Label>
                <Input
                  id="commercialResponsible"
                  value={commercialResponsible}
                  onChange={(e) => setCommercialResponsible(e.target.value)}
                  placeholder="Nome do responsável comercial"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiterResponsible">Recrutador Responsável</Label>
                <Input
                  id="recruiterResponsible"
                  value={recruiterResponsible}
                  onChange={(e) => setRecruiterResponsible(e.target.value)}
                  placeholder="Nome do recrutador responsável"
                />
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
