import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

type InstagramMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
  read?: {
    mid?: string;
  };
};

function msToIso(timestampMs?: number): string | null {
  if (!timestampMs) return null;

  const date = new Date(timestampMs);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getConversationParts(event: InstagramMessagingEvent) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const isEcho = event.message?.is_echo === true;

  if (!senderId || !recipientId) {
    return null;
  }

  const igAccountId = isEcho ? senderId : recipientId;
  const externalUserId = isEcho ? recipientId : senderId;
  const conversationId = `${igAccountId}:${externalUserId}`;

  return {
    senderId,
    recipientId,
    igAccountId,
    externalUserId,
    conversationId,
    isEcho,
  };
}

async function saveRawWebhookEvent(params: {
  body: unknown;
  metaObject?: string;
  eventType: string;
  igAccountId?: string | null;
  senderId?: string | null;
  recipientId?: string | null;
  messageId?: string | null;
}) {
  const { error } = await supabaseAdmin.from("webhook_events").insert({
    meta_object: params.metaObject || null,
    event_type: params.eventType,
    ig_account_id: params.igAccountId || null,
    sender_id: params.senderId || null,
    recipient_id: params.recipientId || null,
    message_id: params.messageId || null,
    raw_payload: params.body,
  });

  if (error) {
    console.error("Supabase webhook_events insert error:", error);
  }
}

async function upsertMessage(params: {
  event: InstagramMessagingEvent;
  body: unknown;
}) {
  const { event, body } = params;
  const message = event.message;

  if (!message?.mid) return;

  const parts = getConversationParts(event);
  if (!parts) return;

  const direction = parts.isEcho ? "outbound" : "inbound";
  const sentAt = msToIso(event.timestamp);

  const { error: messageError } = await supabaseAdmin.from("messages").upsert(
    {
      message_id: message.mid,
      conversation_id: parts.conversationId,
      ig_account_id: parts.igAccountId,
      external_user_id: parts.externalUserId,
      direction,
      text: message.text || null,
      is_echo: parts.isEcho,
      timestamp_ms: event.timestamp || null,
      sent_at: sentAt,
      raw_payload: body,
    },
    {
      onConflict: "message_id",
    }
  );

  if (messageError) {
    console.error("Supabase messages upsert error:", messageError);
  }

  const conversationUpdate =
    direction === "inbound"
      ? {
          conversation_id: parts.conversationId,
          ig_account_id: parts.igAccountId,
          external_user_id: parts.externalUserId,
          status: "pending",
          needs_response: true,
          last_user_message_at: sentAt,
          last_message_text: message.text || null,
          last_message_direction: direction,
          updated_at: new Date().toISOString(),
        }
      : {
          conversation_id: parts.conversationId,
          ig_account_id: parts.igAccountId,
          external_user_id: parts.externalUserId,
          status: "answered",
          needs_response: false,
          last_business_reply_at: sentAt,
          last_message_text: message.text || null,
          last_message_direction: direction,
          updated_at: new Date().toISOString(),
        };

  const { error: conversationError } = await supabaseAdmin
    .from("conversations")
    .upsert(conversationUpdate, {
      onConflict: "conversation_id",
    });

  if (conversationError) {
    console.error("Supabase conversations upsert error:", conversationError);
  }
}

async function saveReadEvent(params: {
  event: InstagramMessagingEvent;
  body: unknown;
}) {
  const { event, body } = params;
  const read = event.read;

  if (!read) return;

  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;

  if (!senderId || !recipientId) return;

  const igAccountId = recipientId;
  const externalUserId = senderId;
  const conversationId = `${igAccountId}:${externalUserId}`;
  const readAt = msToIso(event.timestamp);

  const { error: readError } = await supabaseAdmin
    .from("message_read_events")
    .insert({
      conversation_id: conversationId,
      ig_account_id: igAccountId,
      external_user_id: externalUserId,
      read_message_id: read.mid || null,
      reader_id: senderId,
      read_at: readAt,
      timestamp_ms: event.timestamp || null,
      raw_payload: body,
    });

  if (readError) {
    console.error("Supabase message_read_events insert error:", readError);
  }

  const { error: conversationError } = await supabaseAdmin
    .from("conversations")
    .upsert(
      {
        conversation_id: conversationId,
        ig_account_id: igAccountId,
        external_user_id: externalUserId,
        last_seen_at: readAt,
        last_seen_message_id: read.mid || null,
        last_seen_by: senderId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "conversation_id",
      }
    );

  if (conversationError) {
    console.error(
      "Supabase conversations seen update error:",
      conversationError
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("Webhook verification request:", {
    mode,
    tokenFromUrl: token,
    verifyTokenFromEnv: VERIFY_TOKEN,
    challenge,
    tokenMatches: token === VERIFY_TOKEN,
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    {
      error: "Forbidden",
      received: {
        mode,
        tokenFromUrl: token,
        verifyTokenFromEnv: VERIFY_TOKEN || "ENV_NOT_FOUND",
        tokenMatches: token === VERIFY_TOKEN,
        challenge,
      },
    },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("META WEBHOOK RAW PAYLOAD:");
    console.log(JSON.stringify(body, null, 2));

    const metaObject = body.object;
    const entries = body.entry || [];

    for (const entry of entries) {
      const messagingEvents: InstagramMessagingEvent[] = entry.messaging || [];

      for (const event of messagingEvents) {
        const message = event.message;
        const read = event.read;
        const parts = getConversationParts(event);

        if (message) {
          const isEcho = message.is_echo === true;
          const direction = isEcho ? "outbound" : "inbound";

          console.log("PARSED MESSAGE EVENT:", {
            event_type: "message",
            direction,
            isEcho,
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
            messageId: message.mid,
            text: message.text || null,
            timestamp: event.timestamp,
          });

          await saveRawWebhookEvent({
            body,
            metaObject,
            eventType: "message",
            igAccountId: parts?.igAccountId,
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
            messageId: message.mid,
          });

          await upsertMessage({ event, body });
        } else if (read) {
          console.log("PARSED READ EVENT:", {
            event_type: "read",
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
            readMessageId: read.mid,
            timestamp: event.timestamp,
          });

          await saveRawWebhookEvent({
            body,
            metaObject,
            eventType: "read",
            igAccountId: event.recipient?.id,
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
            messageId: read.mid,
          });

          await saveReadEvent({ event, body });
        } else {
          console.log("PARSED UNKNOWN EVENT:", {
            event,
          });

          await saveRawWebhookEvent({
            body,
            metaObject,
            eventType: "unknown",
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
          });
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }
}