// Edge Function: activa el plan Pro cuando tu pasarela de pago confirma un cobro.
// Despliegue:  supabase functions deploy pago-webhook --no-verify-jwt
//              supabase secrets set WEBHOOK_SECRET=una-clave-larga-y-aleatoria
// IMPORTANTE: adapta la verificación a la firma real de tu pasarela (Culqi, Niubiz, Mercado Pago...).
// Este ejemplo valida una clave compartida; NO uses en producción sin verificar la firma oficial.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

function safeEq(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.byteLength !== eb.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < ea.byteLength; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  const expected = Deno.env.get('WEBHOOK_SECRET') || '';
  const provided = req.headers.get('x-webhook-secret') || '';
  if (expected.length < 16) return new Response('Webhook no configurado', { status: 500 });
  if (!provided || !safeEq(provided, expected)) {
    return new Response('No autorizado', { status: 401 });
  }
  let body: { user_id?: string; estado?: string; dias?: number };
  try { body = await req.json(); } catch { return new Response('JSON inválido', { status: 400 }); }
  const dias = Math.min(Math.max(Number(body.dias) || 30, 1), 366);
  if (!body.user_id || body.estado !== 'pagado') return new Response('Ignorado', { status: 200 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id)) {
    return new Response('user_id inválido', { status: 400 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: cur } = await admin.from('perfiles').select('pro_hasta').eq('user_id', body.user_id).maybeSingle();
  const baseMs = Math.max(Date.now(), cur?.pro_hasta ? Date.parse(cur.pro_hasta) || 0 : 0);
  const hasta = new Date(baseMs + dias * 86400000).toISOString();
  const { data: upd, error } = await admin.from('perfiles').update({ plan: 'pro', pro_hasta: hasta }).eq('user_id', body.user_id).select('user_id');
  if (error || !upd?.length) return new Response('Error al activar el plan', { status: 500 });
  return new Response('OK', { status: 200 });
});
