import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const { user, loading, roles, mustChangePassword } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && mustChangePassword) {
      navigate("/change-password");
    }
  }, [loading, user, mustChangePassword, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Verificar se usuário tem algum papel atribuído
  if (roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aguarde um momento</h2>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
