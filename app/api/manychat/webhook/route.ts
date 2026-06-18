import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ManyChatWebhookBody = {
  manychat_contact_id?: string;
  instagram_username?: string;
  full_name?: string;
  automation_name?: string;
  flow_name?: string;
  message_text?: string;
  event_type?: string;
};

function cleanInstagramUsername(username?: string) {
  if (!username) return null;

  return username.trim().replace(/^@/, "").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const secretFromHeader = req.headers.get("x-manychat-secret");
    const expectedSecret = process.env.MANYCHAT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("Missing MANYCHAT_WEBHOOK_SECRET");

      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    if (secretFromHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ManyChatWebhookBody;
    const supabaseAdmin = getSupabaseAdmin();

    const instagramUsername = cleanInstagramUsername(body.instagram_username);

    let matchedConversationId: string | null = null;
    let matchedExternalUserId: string | null = null;

    if (instagramUsername) {
      const { data: conversation, error: conversationError } =
        await supabaseAdmin
          .from("conversations")
          .select("conversation_id, external_user_id")
          .eq("external_username", instagramUsername)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (conversationError) {
        console.error("ManyChat conversation match error:", conversationError);
      }

      if (conversation) {
        matchedConversationId = conversation.conversation_id;
        matchedExternalUserId = conversation.external_user_id;

        const nowIso = new Date().toISOString();

        const { error: updateError } = await supabaseAdmin
          .from("conversations")
          .update({
            status: "bot_answered",
            needs_response: true,
            last_outbound_type: "automation",
            last_automation_reply_at: nowIso,
            updated_at: nowIso,
          })
          .eq("conversation_id", conversation.conversation_id);

        if (updateError) {
          console.error("ManyChat conversation update error:", updateError);
        }
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("manychat_events")
      .insert({
        manychat_contact_id: body.manychat_contact_id || null,
        instagram_username: instagramUsername,
        full_name: body.full_name || null,
        automation_name: body.automation_name || null,
        flow_name: body.flow_name || null,
        message_text: body.message_text || null,
        event_type: body.event_type || "automation_triggered",
        matched_conversation_id: matchedConversationId,
        matched_external_user_id: matchedExternalUserId,
        raw_payload: body,
      });

    if (insertError) {
      console.error("ManyChat event insert error:", insertError);

      return NextResponse.json(
        { error: "Failed to save event" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      matched_conversation_id: matchedConversationId,
    });
  } catch (error) {
    console.error("ManyChat webhook error:", error);

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}