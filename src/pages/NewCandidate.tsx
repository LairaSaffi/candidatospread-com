import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function NewCandidate() {
  const { jobId } = useParams();
  const [name, setName] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const uploadFile = async (file: File, bucket: string, candidateId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .insert({
          job_id: jobId,
          name,
          hr_interview_notes: hrNotes || null,
          status: "pending",
        })
        .select()
        .single();

      if (candidateError) throw candidateError;

      let cvUrl = null;
      let testUrl = null;

      if (cvFile) {
        cvUrl = await uploadFile(cvFile, "cvs", candidate.id);
      }

      if (testFile) {
        testUrl = await uploadFile(testFile, "technical-tests", candidate.id);
      }

      if (cvUrl || testUrl) {
        const { error: updateError } = await supabase
          .from("candidates")
          .update({
            cv_url: cvUrl,
            technical_test_url: testUrl,
          })
          .eq("id", candidate.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Candidato adicionado!",
        description: "O candidato foi adicionado com sucesso.",
      });

      navigate(`/jobs/${jobId}`);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar candidato",
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
            onClick={() => navigate(`/jobs/${jobId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Adicionar Candidato</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do candidato"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv">Anexo do CV (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {cvFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCvFile(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test">Anexo de Teste Técnico (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="test"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setTestFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {testFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTestFile(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hrNotes">Parecer RH</Label>
                <Textarea
                  id="hrNotes"
                  value={hrNotes}
                  onChange={(e) => setHrNotes(e.target.value)}
                  placeholder="Parecer do RH sobre o candidato"
                  rows={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/jobs/${jobId}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Salvando..." : "Adicionar Candidato"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
