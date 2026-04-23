// Session 8: Edge Function triggered by Supabase DB webhook on notifications insert.
// Sends email via Resend to configured staff recipients.
//
// Deploy with: supabase functions deploy send-notification

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (_req: Request) => {
  // TODO Session 8: parse notification payload, look up recipients, send via Resend
  return new Response(JSON.stringify({ status: "not implemented" }), {
    headers: { "Content-Type": "application/json" },
    status: 501,
  });
});
