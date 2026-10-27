import { createClient } from 'npm:@supabase/supabase-js@2';

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return value;
}

export const webUrl = () => requireEnv('WEB_URL').replace(/\/+$/, '');
export const functionsUrl = () => `${requireEnv('SUPABASE_URL').replace(/\/+$/, '')}/functions/v1`;

/** Client mit Service-Role-Key: umgeht RLS, nur serverseitig verwenden. */
export function adminClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
