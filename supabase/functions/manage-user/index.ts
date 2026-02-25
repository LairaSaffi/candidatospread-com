import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getAllowedOrigin = (requestOrigin: string | null): string => {
  if (!requestOrigin) return "";
  
  const allowedPatterns = [
    /^https:\/\/.*\.lovable\.app$/,
    /^https:\/\/.*\.lovableproject\.com$/,
    /^http:\/\/localhost(:\d+)?$/,
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

type Action = "reset-password" | "disable-user" | "enable-user" | "resend-invite";

interface ManageUserRequest {
  action: Action;
  user_id: string;
  email?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token via direct API call with service role key
    const userResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")!}/auth/v1/user`,
      {
        headers: {
          Authorization: authHeader,
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        },
      }
    );

    if (!userResponse.ok) {
      const errBody = await userResponse.text();
      console.error("Token validation failed:", userResponse.status, errBody);
      return new Response(JSON.stringify({ error: "Sessão inválida. Faça login novamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callingUser = await userResponse.json();
    const callingUserId = callingUser.id;

    // Admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if caller is admin
    const { data: adminCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, user_id, email }: ManageUserRequest = await req.json();

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "Ação e ID do usuário são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent admin from disabling themselves
    if ((action === "disable-user") && user_id === callingUserId) {
      return new Response(JSON.stringify({ error: "Você não pode desativar sua própria conta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (action) {
      case "reset-password": {
        if (!email) {
          return new Response(JSON.stringify({ error: "E-mail é obrigatório para redefinir senha" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Generate a password reset link
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: email,
        });

        if (error) {
          console.error("Error generating reset link:", error);
          return new Response(JSON.stringify({ error: "Não foi possível gerar o link de redefinição de senha" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        result = { 
          success: true, 
          message: "Link de redefinição de senha gerado",
          resetLink: data.properties?.action_link
        };
        console.log("Password reset link generated for user:", user_id);
        break;
      }

      case "disable-user": {
        // Ban the user indefinitely
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h", // ~100 years
        });

        if (banError) {
          console.error("Error banning user:", banError);
          return new Response(JSON.stringify({ error: "Não foi possível desativar o usuário" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile status
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_active: false })
          .eq("id", user_id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }

        result = { success: true, message: "Usuário desativado com sucesso" };
        console.log("User disabled:", user_id);
        break;
      }

      case "enable-user": {
        // Remove ban
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });

        if (unbanError) {
          console.error("Error unbanning user:", unbanError);
          return new Response(JSON.stringify({ error: "Não foi possível reativar o usuário" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile status
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_active: true })
          .eq("id", user_id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }

        result = { success: true, message: "Usuário reativado com sucesso" };
        console.log("User enabled:", user_id);
        break;
      }

      case "resend-invite": {
        if (!email) {
          return new Response(JSON.stringify({ error: "E-mail é obrigatório para reenviar convite" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Generate a magic link for the user
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email,
        });

        if (error) {
          console.error("Error generating magic link:", error);
          return new Response(JSON.stringify({ error: "Não foi possível gerar o link de convite" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        result = { 
          success: true, 
          message: "Link de convite gerado",
          inviteLink: data.properties?.action_link
        };
        console.log("Invite link generated for user:", user_id);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro inesperado:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
