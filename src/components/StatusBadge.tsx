import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "open" | "closed" | "on_hold" | "pending" | "under_review" | "approved" | "rejected";
  className?: string;
}

const statusConfig = {
  open: { label: "Aberta", variant: "default" as const },
  closed: { label: "Fechada", variant: "secondary" as const },
  on_hold: { label: "Em Espera", variant: "outline" as const },
  pending: { label: "Pendente", variant: "default" as const },
  under_review: { label: "Em Análise", variant: "default" as const },
  approved: { label: "Aprovado", variant: "default" as const },
  rejected: { label: "Recusado", variant: "destructive" as const },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(
        status === "approved" && "bg-success text-success-foreground",
        status === "pending" && "bg-pending text-primary-foreground",
        className
      )}
    >
      {config.label}
    </Badge>
  );
};
