import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getAllowedOrigin = (requestOrigin: string | null): string => {
  if (!requestOrigin) return "";
  
  const allowedPatterns = [
    /^https:\/\/.*\.lovable\.app$/,
    /^https:\/\/.*\.lovableproject\.com$/,
    /^http:\/\/localhost(:\d+)?$/,
    /^https:\/\/candidatospread\.com$/,
    /^https:\/\/www\.candidatospread\.com$/,
  ];
  
  if (allowedPatterns.some(pattern => pattern.test(requestOrigin))) {
    return requestOrigin;
  }
  
  return "";
};

const getCorsHeaders = (requestOrigin: string | null) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(requestOrigin),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
});

interface NotifyRequest {
  job_id: string;
  candidate_id?: string;
  candidate_name: string;
  decision: "interested" | "rejected";
  justification?: string;
  interview_schedule_options?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role client for all operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id, candidate_id, candidate_name, decision, justification, interview_schedule_options }: NotifyRequest = await req.json();

    console.log(`Notificando avaliação: job_id=${job_id}, candidate_id=${candidate_id ?? "(n/a)"}, candidato=${candidate_name}, decisão=${decision}`);

    // Buscar dados da vaga
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("title, client, spread_manager_id, commercial_responsible_id, recruiter_responsible_id")
      .eq("id", job_id)
      .single();

    if (jobError) {
      console.error("Erro ao buscar vaga:", jobError);
      throw new Error("Vaga não encontrada");
    }

    // Atualizar status do candidato
    const newStatus = decision === "interested" ? "approved" : "rejected";
    if (candidate_id) {
      const { error: candidateUpdateError } = await supabase
        .from("candidates")
        .update({ status: newStatus })
        .eq("id", candidate_id);

      if (candidateUpdateError) {
        console.error("Erro ao atualizar status do candidato:", candidateUpdateError);
        throw new Error("Erro ao atualizar status do candidato");
      }
      console.log(`Status do candidato atualizado para: ${newStatus}`);
    }

    // Coletar IDs dos responsáveis internos
    const responsibleIds: string[] = [];
    if (job.spread_manager_id) responsibleIds.push(job.spread_manager_id);
    if (job.commercial_responsible_id) responsibleIds.push(job.commercial_responsible_id);
    if (job.recruiter_responsible_id) responsibleIds.push(job.recruiter_responsible_id);

    const uniqueIds = [...new Set(responsibleIds)];

    if (uniqueIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum responsável para notificar" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar notificações in-app para cada responsável
    const decisionText = decision === "interested" ? "APROVADO" : "REPROVADO";
    
    let messageDetails = "";
    if (decision === "rejected" && justification) {
      messageDetails = `\nMotivo: ${justification}`;
    } else if (decision === "interested" && interview_schedule_options) {
      messageDetails = `\nHorários sugeridos: ${interview_schedule_options}`;
    }

    const notifications = uniqueIds.map(userId => ({
      user_id: userId,
      title: `Candidato ${decisionText}: ${candidate_name}`,
      message: `O cliente avaliou o candidato ${candidate_name} para a vaga "${job.title}"${job.client ? ` (${job.client})` : ""} como ${decisionText}.${messageDetails}`,
      metadata: {
        job_id,
        candidate_id: candidate_id || null,
        decision,
        candidate_name,
        job_title: job.title,
        client: job.client,
      },
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Erro ao criar notificações:", notifError);
      throw new Error("Erro ao criar notificações");
    }

    console.log(`Notificações criadas para ${uniqueIds.length} responsáveis`);

    return new Response(
      JSON.stringify({ success: true, notified_users: uniqueIds.length }),
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
