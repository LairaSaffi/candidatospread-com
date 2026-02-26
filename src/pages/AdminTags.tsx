import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TagItem {
  id: string;
  name: string;
}

export default function AdminTags() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    loadTags();
  }, [isAdmin]);

  const loadTags = async () => {
    const { data, error } = await supabase.from("tags").select("*").order("name");
    if (error) {
      toast({ title: "Erro ao carregar tags", description: error.message, variant: "destructive" });
    } else {
      setTags(data || []);
    }
    setLoading(false);
  };

  const addTag = async () => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed) return;
    setAdding(true);
    const { error } = await supabase.from("tags").insert({ name: trimmed });
    if (error) {
      toast({ title: "Erro ao adicionar tag", description: error.message === 'duplicate key value violates unique constraint "tags_name_key"' ? "Essa tag já existe." : error.message, variant: "destructive" });
    } else {
      setNewTag("");
      toast({ title: "Tag adicionada!" });
      loadTags();
    }
    setAdding(false);
  };

  const deleteTag = async (id: string) => {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir tag", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag excluída!" });
      loadTags();
    }
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Gerenciar Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag (ex: java, python, react)"
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <Button onClick={addTag} disabled={adding || !newTag.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : tags.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma tag cadastrada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1">
                    <span className="text-sm font-medium">#{tag.name}</span>
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
