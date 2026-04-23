/**
 * Triggered by a Supabase DB webhook on INSERT into the notifications table.
 * Webhook payload shape: { type: "INSERT", record: NotificationsRow, ... }
 *
 * Recipients by notification type:
 *   tool_down     → Steven (owner) + Flash (shop_master)
 *   reorder_needed → Steven only (owner)
 *
 * Deploy: supabase functions deploy send-notification
 * Set secrets: supabase secrets set RESEND_API_KEY=re_... FROM_EMAIL=shopkeeper@thejoinery.club
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "shopkeeper@thejoinery.club";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, string>;
  created_at: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: NotificationRow;
};

function buildEmail(notification: NotificationRow): { subject: string; html: string } {
  const { type, payload } = notification;

  if (type === "tool_down") {
    const toolName = payload.tool_name ?? "Unknown tool";
    const toolSlug = payload.tool_slug ?? "";
    const issueTitle = payload.issue_title ?? "";
    return {
      subject: `[ShopKeeper] Tool down: ${toolName}`,
      html: `
        <p><strong>${toolName}</strong> has been marked out of service.</p>
        ${issueTitle ? `<p>Issue reported: ${issueTitle}</p>` : ""}
        ${toolSlug ? `<p><a href="https://shopkeeper.thejoinery.club/tools/${toolSlug}">View tool →</a></p>` : ""}
      `,
    };
  }

  if (type === "reorder_needed") {
    const consumableName = payload.consumable_name ?? "Unknown consumable";
    const onHand = payload.quantity_on_hand ?? "?";
    const threshold = payload.reorder_threshold ?? "?";
    const vendor = payload.vendor ?? "";
    return {
      subject: `[ShopKeeper] Reorder needed: ${consumableName}`,
      html: `
        <p><strong>${consumableName}</strong> is low on stock.</p>
        <p>On hand: ${onHand} / Threshold: ${threshold}</p>
        ${vendor ? `<p>Preferred vendor: ${vendor}</p>` : ""}
        <p><a href="https://shopkeeper.thejoinery.club/inventory">View inventory →</a></p>
      `,
    };
  }

  return {
    subject: `[ShopKeeper] New notification`,
    html: `<p>A new notification was generated. <a href="https://shopkeeper.thejoinery.club/notifications">View →</a></p>`,
  };
}

async function getRecipients(notificationType: string): Promise<string[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // owner always gets everything; shop_master gets tool_down
  const roles =
    notificationType === "tool_down" ? ["owner", "shop_master"] : ["owner"];

  const { data } = await supabase
    .from("staff")
    .select("id")
    .in("role", roles)
    .eq("active", true);

  if (!data?.length) return [];

  // Look up emails from auth.users via service role
  const emails: string[] = [];
  for (const row of data) {
    const { data: user } = await supabase.auth.admin.getUserById(row.id);
    if (user?.user?.email) emails.push(user.user.email);
  }
  return emails;
}

async function sendEmail(to: string[], subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

Deno.serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const notification = payload.record;
    const recipients = await getRecipients(notification.type);

    if (!recipients.length) {
      console.log("No recipients for notification type:", notification.type);
      return new Response(JSON.stringify({ sent: false, reason: "no recipients" }), { status: 200 });
    }

    const { subject, html } = buildEmail(notification);
    await sendEmail(recipients, subject, html);

    console.log(`Sent '${subject}' to ${recipients.join(", ")}`);
    return new Response(JSON.stringify({ sent: true, recipients }), { status: 200 });
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
