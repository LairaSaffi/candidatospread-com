import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  job_id: string;
  candidate_name: string;
  decision: "interested" | "rejected";
  justification?: string;
  interview_schedule_options?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id, candidate_name, decision, justification, interview_schedule_options }: NotifyRequest = await req.json();

    console.log(`Notificando avaliação: job_id=${job_id}, candidato=${candidate_name}, decisão=${decision}`);

    // Buscar dados da vaga com os IDs dos responsáveis (não inclui responsible_manager que é do cliente)
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("title, client, spread_manager_id, commercial_responsible_id, recruiter_responsible_id")
      .eq("id", job_id)
      .single();

    if (jobError) {
      console.error("Erro ao buscar vaga:", jobError);
      throw new Error("Vaga não encontrada");
    }

    console.log("Dados da vaga:", job);

    // Coletar IDs dos responsáveis internos (spread, comercial e recrutador)
    const responsibleIds: string[] = [];
    if (job.spread_manager_id) responsibleIds.push(job.spread_manager_id);
    if (job.commercial_responsible_id) responsibleIds.push(job.commercial_responsible_id);
    if (job.recruiter_responsible_id) responsibleIds.push(job.recruiter_responsible_id);

    // Remover duplicatas
    const uniqueIds = [...new Set(responsibleIds)];

    if (uniqueIds.length === 0) {
      console.log("Nenhum responsável atribuído para notificar");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum responsável para notificar" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar e-mails dos responsáveis na tabela profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("id", uniqueIds);

    if (profilesError) {
      console.error("Erro ao buscar perfis:", profilesError);
      throw new Error("Erro ao buscar perfis dos responsáveis");
    }

    const emails = profiles?.map(p => p.email).filter(Boolean) || [];

    if (emails.length === 0) {
      console.log("Nenhum e-mail encontrado para os responsáveis");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum e-mail para notificar" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("E-mails para notificar:", emails);

    const decisionText = decision === "interested" ? "APROVADO" : "REPROVADO";
    const decisionColor = decision === "interested" ? "#22c55e" : "#ef4444";

    let detailsHtml = "";
    if (decision === "rejected" && justification) {
      detailsHtml = `
        <div style="margin-top: 16px; padding: 12px; background-color: #fef2f2; border-radius: 8px;">
          <strong>Motivo da reprovação:</strong>
          <p style="margin: 8px 0 0 0;">${justification}</p>
        </div>
      `;
    } else if (decision === "interested" && interview_schedule_options) {
      detailsHtml = `
        <div style="margin-top: 16px; padding: 12px; background-color: #f0fdf4; border-radius: 8px;">
          <strong>Horários sugeridos para entrevista:</strong>
          <p style="margin: 8px 0 0 0;">${interview_schedule_options}</p>
        </div>
      `;
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Avaliação de Candidato</h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Vaga:</strong> ${job.title}</p>
          ${job.client ? `<p style="margin: 0 0 8px 0;"><strong>Cliente:</strong> ${job.client}</p>` : ""}
          <p style="margin: 0 0 8px 0;"><strong>Candidato:</strong> ${candidate_name}</p>
          <p style="margin: 0;">
            <strong>Decisão do Cliente:</strong> 
            <span style="color: ${decisionColor}; font-weight: bold;">${decisionText}</span>
          </p>
        </div>

        ${detailsHtml}

        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          Esta é uma notificação automática do sistema de recrutamento.
        </p>
      </div>
    `;

    // Enviar e-mail para cada destinatário
    for (const email of emails) {
      try {
        const response = await resend.emails.send({
          from: "Recrutamento <onboarding@resend.dev>",
          to: [email],
          subject: `[${decisionText}] Candidato ${candidate_name} - ${job.title}`,
          html: emailHtml,
        });
        console.log(`E-mail enviado para ${email}:`, response);
      } catch (emailError) {
        console.error(`Erro ao enviar e-mail para ${email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: emails }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro na função notify-evaluation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
