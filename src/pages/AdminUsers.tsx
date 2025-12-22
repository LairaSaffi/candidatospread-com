import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Loader2, Users, MoreHorizontal, KeyRound, UserX, UserCheck, Mail, Copy, Check } from "lucide-react";

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  role: z.enum(["admin", "comercial", "gestao_operacao"]),
});

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  gestao_operacao: "Gestão da Operação",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; title: string; link: string }>({
    open: false,
    title: "",
    link: "",
  });
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "" as string,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { isAdmin, session, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          is_active,
          created_at,
          user_roles (role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const usersWithRoles = data.map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        is_active: profile.is_active ?? true,
        role: profile.user_roles?.[0]?.role || "sem papel",
        created_at: profile.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = createUserSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setCreating(true);
    try {
      const invokeResult = await supabase.functions.invoke("create-user", {
        body: formData,
      });

      if (invokeResult.error) {
        let message = invokeResult.error.message;

        if (invokeResult.response instanceof Response) {
          try {
            const contentType = (invokeResult.response.headers.get("content-type") || "")
              .split(";")[0]
              .trim();

            if (contentType === "application/json") {
              const json = await invokeResult.response.clone().json();
              if (typeof json?.error === "string" && json.error.trim()) {
                message = json.error;
              }
            } else {
              const text = await invokeResult.response.clone().text();
              try {
                const json = JSON.parse(text);
                if (typeof json?.error === "string" && json.error.trim()) {
                  message = json.error;
                } else if (text.trim()) {
                  message = text;
                }
              } catch {
                if (text.trim()) message = text;
              }
            }
          } catch {
            // ignore parsing errors
          }
        }

        throw new Error(message);
      }

      if (invokeResult.data?.error) {
        throw new Error(invokeResult.data.error);
      }

      toast({
        title: "Usuário criado!",
        description: `${formData.full_name} foi cadastrado com sucesso.`,
      });

      setFormData({ email: "", password: "", full_name: "", role: "" });
      setDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUserAction = async (action: string, targetUser: UserWithRole) => {
    setActionLoading(`${action}-${targetUser.id}`);

    try {
      const invokeResult = await supabase.functions.invoke("manage-user", {
        body: {
          action,
          user_id: targetUser.id,
          email: targetUser.email,
        },
      });

      if (invokeResult.error) {
        let message = invokeResult.error.message;

        if (invokeResult.response instanceof Response) {
          try {
            const json = await invokeResult.response.clone().json();
            if (typeof json?.error === "string" && json.error.trim()) {
              message = json.error;
            }
          } catch {
            // ignore
          }
        }

        throw new Error(message);
      }

      if (invokeResult.data?.error) {
        throw new Error(invokeResult.data.error);
      }

      // Handle actions that return links
      if (action === "reset-password" && invokeResult.data?.resetLink) {
        setLinkDialog({
          open: true,
          title: "Link de Redefinição de Senha",
          link: invokeResult.data.resetLink,
        });
      } else if (action === "resend-invite" && invokeResult.data?.inviteLink) {
        setLinkDialog({
          open: true,
          title: "Link de Convite",
          link: invokeResult.data.inviteLink,
        });
      } else {
        toast({
          title: "Sucesso",
          description: invokeResult.data?.message || "Ação realizada com sucesso.",
        });
      }

      // Reload users to reflect any status changes
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiado!",
        description: "Link copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
              <p className="text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados abaixo para criar um novo usuário no sistema.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nome do usuário"
                    disabled={creating}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    disabled={creating}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    disabled={creating}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Papel</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                    disabled={creating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="gestao_operacao">Gestão da Operação</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDialogOpen(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Usuário"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((targetUser) => {
                  const isCurrentUser = targetUser.id === user?.id;
                  return (
                    <TableRow key={targetUser.id} className={!targetUser.is_active ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{targetUser.full_name}</TableCell>
                      <TableCell>{targetUser.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {roleLabels[targetUser.role] || targetUser.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={targetUser.is_active ? "default" : "destructive"}>
                          {targetUser.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(targetUser.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleUserAction("reset-password", targetUser)}
                              disabled={actionLoading === `reset-password-${targetUser.id}`}
                            >
                              {actionLoading === `reset-password-${targetUser.id}` ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <KeyRound className="h-4 w-4 mr-2" />
                              )}
                              Redefinir Senha
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUserAction("resend-invite", targetUser)}
                              disabled={actionLoading === `resend-invite-${targetUser.id}`}
                            >
                              {actionLoading === `resend-invite-${targetUser.id}` ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4 mr-2" />
                              )}
                              Reenviar Convite
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {targetUser.is_active ? (
                              <DropdownMenuItem
                                onClick={() => handleUserAction("disable-user", targetUser)}
                                disabled={isCurrentUser || actionLoading === `disable-user-${targetUser.id}`}
                                className="text-destructive focus:text-destructive"
                              >
                                {actionLoading === `disable-user-${targetUser.id}` ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <UserX className="h-4 w-4 mr-2" />
                                )}
                                Desativar Usuário
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleUserAction("enable-user", targetUser)}
                                disabled={actionLoading === `enable-user-${targetUser.id}`}
                                className="text-green-600 focus:text-green-600"
                              >
                                {actionLoading === `enable-user-${targetUser.id}` ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <UserCheck className="h-4 w-4 mr-2" />
                                )}
                                Reativar Usuário
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Link Dialog */}
      <Dialog open={linkDialog.open} onOpenChange={(open) => setLinkDialog({ ...linkDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{linkDialog.title}</DialogTitle>
            <DialogDescription>
              Copie o link abaixo e envie para o usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={linkDialog.link}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(linkDialog.link)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Este link é válido por tempo limitado. Envie-o diretamente ao usuário.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
