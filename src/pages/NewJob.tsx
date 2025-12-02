import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function NewJob() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [client, setClient] = useState("");
  const [responsibleManager, setResponsibleManager] = useState("");
  const [spreadManager, setSpreadManager] = useState("");
  const [commercialResponsible, setCommercialResponsible] = useState("");
  const [recruiterResponsible, setRecruiterResponsible] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("jobs").insert({
        title,
        description,
        work_model: workModel || null,
        client: client || null,
        responsible_manager: responsibleManager || null,
        spread_manager: spreadManager || null,
        commercial_responsible: commercialResponsible || null,
        recruiter_responsible: recruiterResponsible || null,
        created_by: user.id,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Vaga criada!",
        description: "A vaga foi criada com sucesso.",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro ao criar vaga",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Nova Vaga</CardTitle>
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
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Criando..." : "Criar Vaga"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
