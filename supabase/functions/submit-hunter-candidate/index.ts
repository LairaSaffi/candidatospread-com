import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await req.formData();
    const hunterToken = formData.get("hunter_token") as string;
    const name = formData.get("name") as string;
    const position = formData.get("position") as string | null;
    const seniority = formData.get("seniority") as string | null;
    const candidateType = formData.get("candidate_type") as string | null;
    const salaryExpectation = formData.get("salary_expectation") as string | null;
    const hiringModel = formData.get("hiring_model") as string | null;
    const hrNotes = formData.get("hr_notes") as string | null;
    const tagsJson = formData.get("tags") as string | null;
    const cvFile = formData.get("cv_file") as File | null;
    const spreadCvFile = formData.get("spread_cv_file") as File | null;

    if (!hunterToken || !name) {
      return new Response(JSON.stringify({ error: "Token e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token
    const { data: linkData } = await supabase
      .from("hunter_links")
      .select("id")
      .eq("hunter_token", hunterToken)
      .single();

    if (!linkData) {
      return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert candidate
    const { data: candidate, error: candidateError } = await supabase
      .from("hunter_candidates")
      .insert({
        hunter_link_id: linkData.id,
        name,
        position: position || null,
        seniority: seniority || null,
        candidate_type: candidateType || "externo",
        salary_expectation: salaryExpectation || null,
        hiring_model: hiringModel || null,
        hr_notes: hrNotes || null,
        hunter_name: hunterName || null,
        hunter_email: hunterEmail || null,
      })
      .select("id")
      .single();

    if (candidateError) throw candidateError;

    // Upload CV file
    let cvUrl = null;
    if (cvFile && cvFile.size > 0) {
      const ext = cvFile.name.split(".").pop();
      const path = `${candidate.id}/${Date.now()}_cv.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(path, cvFile);
      if (!uploadError) cvUrl = path;
    }

    // Upload Spread CV file
    let spreadCvUrl = null;
    if (spreadCvFile && spreadCvFile.size > 0) {
      const ext = spreadCvFile.name.split(".").pop();
      const path = `${candidate.id}/${Date.now()}_spread.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("spread-cvs")
        .upload(path, spreadCvFile);
      if (!uploadError) spreadCvUrl = path;
    }

    // Update file URLs
    if (cvUrl || spreadCvUrl) {
      await supabase
        .from("hunter_candidates")
        .update({ cv_url: cvUrl, spread_cv_url: spreadCvUrl })
        .eq("id", candidate.id);
    }

    // Insert tags
    if (tagsJson) {
      try {
        const tagIds = JSON.parse(tagsJson) as string[];
        if (tagIds.length > 0) {
          const tagInserts = tagIds.map((tagId) => ({
            hunter_candidate_id: candidate.id,
            tag_id: tagId,
          }));
          await supabase.from("hunter_candidate_tags").insert(tagInserts);
        }
      } catch {}
    }

    return new Response(JSON.stringify({ success: true, candidate_id: candidate.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
