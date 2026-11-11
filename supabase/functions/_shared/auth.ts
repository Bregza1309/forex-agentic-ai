import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

interface AuthResult {
  user: User | null;
  error: string | null;
}

export async function getUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Missing Authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: error?.message ?? "Authentication failed" };
  }

  return { user, error: null };
}
