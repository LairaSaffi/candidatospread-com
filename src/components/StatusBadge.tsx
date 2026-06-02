import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; colorClass?: string }> = {
  // Job statuses
  open: { label: "Aberta", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  lost: { label: "Perdida", variant: "destructive", colorClass: "bg-orange-500 text-white" },
  completed: { label: "Concluída", variant: "default", colorClass: "bg-emerald-600 text-white" },
  pending: { label: "Pendente", variant: "default" },
  under_review: { label: "Em Análise", variant: "default" },
  approved: { label: "Aprovado", variant: "default", colorClass: "bg-green-500 text-white" },
  rejected: { label: "Reprovado", variant: "destructive" },
  // Internal statuses
  em_contratacao: { label: "Em Contratação", variant: "default", colorClass: "bg-amber-500 text-white" },
  contratado: { label: "Contratado", variant: "default", colorClass: "bg-blue-500 text-white" },
  disponivel: { label: "Disponível", variant: "default", colorClass: "bg-emerald-500 text-white" },
  reprovado_interno: { label: "Reprovado", variant: "destructive" },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant={config.variant} className={cn(config.colorClass, className)}>
      {config.label}
    </Badge>
  );
};