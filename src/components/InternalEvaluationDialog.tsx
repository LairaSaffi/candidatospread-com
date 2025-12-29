import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, ClipboardCheck } from "lucide-react";

interface InternalEvaluationDialogProps {
  candidateId: string;
  candidateName: string;
  jobId: string;
  currentDecision?: string | null;
  currentJustification?: string | null;
  currentScheduleOptions?: string | null;
  onEvaluationComplete: () => void;
}

export function InternalEvaluationDialog({
  candidateId,
  candidateName,
  jobId,
  currentDecision,
  currentJustification,
  currentScheduleOptions,
  onEvaluationComplete,
}: InternalEvaluationDialogProps) {
  const [open, setOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"interested" | "rejected" | null>(null);
  const [rejectionReason, setRejectionReason] = useState(currentJustification || "");
  const [scheduleOptions, setScheduleOptions] = useState(currentScheduleOptions || "");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!pendingDecision) return;

    setSubmitting(true);
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar ou criar um evaluation_link_id para o job
      let evaluationLinkId: string;
      
      const { data: existingLink, error: linkError } = await supabase
        .from("job_evaluation_links")
        .select("id")
        .eq("job_id", jobId)
        .maybeSingle();

      if (linkError) throw linkError;

      if (existingLink) {
        evaluationLinkId = existingLink.id;
      } else {
        // Criar um novo link de avaliação
        const { data: newLink, error: createError } = await supabase
          .from("job_evaluation_links")
          .insert({ job_id: jobId })
          .select("id")
          .single();

        if (createError) throw createError;
        evaluationLinkId = newLink.id;
      }

      // Verificar se já existe uma avaliação para esse candidato neste link
      const { data: existingEval, error: evalCheckError } = await supabase
        .from("candidate_evaluations")
        .select("id")
        .eq("job_evaluation_link_id", evaluationLinkId)
        .eq("candidate_id", candidateId)
        .maybeSingle();

      if (evalCheckError) throw evalCheckError;

      if (existingEval) {
        // Atualizar avaliação existente
        const { error: updateError } = await supabase
          .from("candidate_evaluations")
          .update({
            decision: pendingDecision,
            justification: pendingDecision === "rejected" ? rejectionReason || null : null,
            interview_schedule_options: pendingDecision === "interested" ? scheduleOptions || null : null,
            evaluated_at: new Date().toISOString(),
            evaluated_by_user_id: user.id,
          })
          .eq("id", existingEval.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova avaliação
        const { error: insertError } = await supabase
          .from("candidate_evaluations")
          .insert({
            job_evaluation_link_id: evaluationLinkId,
            candidate_id: candidateId,
            decision: pendingDecision,
            justification: pendingDecision === "rejected" ? rejectionReason || null : null,
            interview_schedule_options: pendingDecision === "interested" ? scheduleOptions || null : null,
            evaluated_at: new Date().toISOString(),
            evaluated_by_user_id: user.id,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Avaliação registrada!",
        description: `Candidato ${pendingDecision === "interested" ? "aprovado" : "reprovado"} com sucesso.`,
      });

      setOpen(false);
      setPendingDecision(null);
      onEvaluationComplete();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar avaliação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setPendingDecision(null);
      setRejectionReason(currentJustification || "");
      setScheduleOptions(currentScheduleOptions || "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="h-4 w-4 mr-2" />
          {currentDecision ? "Alterar Avaliação" : "Avaliar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Candidato</DialogTitle>
          <DialogDescription>
            Registre sua avaliação para {candidateName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!pendingDecision ? (
            <div className="flex gap-3">
              <Button
                onClick={() => setPendingDecision("rejected")}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reprovar
              </Button>
              <Button
                onClick={() => setPendingDecision("interested")}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </div>
          ) : pendingDecision === "rejected" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">
                  Motivo da reprovação (opcional)
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPendingDecision(null)}
                  variant="outline"
                  disabled={submitting}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant="destructive"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Reprovação
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-options">
                  Sugestão de horários para entrevista (opcional)
                </Label>
                <Textarea
                  id="schedule-options"
                  value={scheduleOptions}
                  onChange={(e) => setScheduleOptions(e.target.value)}
                  placeholder="Ex: Segunda e Quarta às 14h..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPendingDecision(null)}
                  variant="outline"
                  disabled={submitting}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-success hover:bg-success/90"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Aprovação
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
