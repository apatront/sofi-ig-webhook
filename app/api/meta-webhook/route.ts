import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchInstagramUserProfile } from "@/lib/instagramProfile";
import { transcribeAudioFromUrl } from "@/lib/transcribeAudio";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

type InstagramAttachment = {
  type?: string;
  payload?: {
    url?: string;
  };
};

type InstagramMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: InstagramAttachment[];
  };
  read?: {
    mid?: string;
  };
};

type MetaWebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: InstagramMessagingEvent[];
  }>;
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

function getFirstAttachment(event: InstagramMessagingEvent) {
  const attachments = event.message?.attachments || [];

  if (attachments.length === 0) {
    return null;
  }

  return attachments[0];
}

function getMessageType(event: InstagramMessagingEvent) {
  const attachment = getFirstAttachment(event);

  if (attachment?.type === "audio") {
    return "audio";
  }

  if (attachment?.type) {
    return attachment.type;
  }

  return "text";
}

function getAttachmentUrl(event: InstagramMessagingEvent) {
  return getFirstAttachment(event)?.payload?.url || null;
}

async function saveRawWebhookEvent(params: {
  body: MetaWebhookBody;
  metaObject?: string;
  eventType: string;
  igAccountId?: string | null;
  senderId?: string | null;
  recipientId?: string | null;
  messageId?: string | null;
}) {
  const supabaseAdmin = getSupabaseAdmin();

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

async function fetchAndUpdateProfileIfNeeded(params: {
  conversationId: string;
  externalUserId: string;
}) {
  const { conversationId, externalUserId } = params;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existingConversation, error: selectError } = await supabaseAdmin
    .from("conversations")
    .select("external_username, profile_fetched_at")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (selectError) {
    console.error("Supabase profile select error:", selectError);
    return;
  }

  const alreadyHasUsername = Boolean(existingConversation?.external_username);

  const fetchedRecently =
    existingConversation?.profile_fetched_at &&
    Date.now() - new Date(existingConversation.profile_fetched_at).getTime() <
      1000 * 60 * 60 * 24 * 7;

  if (alreadyHasUsername && fetchedRecently) {
    return;
  }

  const profile = await fetchInstagramUserProfile(externalUserId);

  if (!profile) {
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("conversations")
    .update({
      external_username: profile.username || null,
      external_name: profile.name || null,
      external_profile_pic: profile.profile_pic || null,
      is_user_follow_business:
        typeof profile.is_user_follow_business === "boolean"
          ? profile.is_user_follow_business
          : null,
      is_business_follow_user:
        typeof profile.is_business_follow_user === "boolean"
          ? profile.is_business_follow_user
          : null,
      is_verified_user:
        typeof profile.is_verified_user === "boolean"
          ? profile.is_verified_user
          : null,
      profile_fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId);

  if (updateError) {
    console.error("Supabase profile update error:", updateError);
  }
}

async function transcribeAndSaveAudio(params: {
  messageId: string;
  conversationId: string;
  audioUrl: string;
  direction: string;
}) {
  const { messageId, conversationId, audioUrl, direction } = params;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existingMessage, error: existingMessageError } =
    await supabaseAdmin
      .from("messages")
      .select("transcription_status, transcription")
      .eq("message_id", messageId)
      .maybeSingle();

  if (existingMessageError) {
    console.error(
      "Supabase existing transcription fetch error:",
      existingMessageError
    );
  }

  if (
    existingMessage?.transcription_status === "completed" &&
    existingMessage?.transcription
  ) {
    console.log("Audio already transcribed:", messageId);
    return;
  }

  const { error: processingError } = await supabaseAdmin
    .from("messages")
    .update({
      transcription_status: "processing",
      transcription_error: null,
    })
    .eq("message_id", messageId);

  if (processingError) {
    console.error(
      "Supabase transcription processing update error:",
      processingError
    );
  }

  try {
    const transcription = await transcribeAudioFromUrl(audioUrl);
    const transcribedAt = new Date().toISOString();

    const { error: messageUpdateError } = await supabaseAdmin
      .from("messages")
      .update({
        transcription,
        transcription_status: "completed",
        transcription_error: null,
        transcribed_at: transcribedAt,
      })
      .eq("message_id", messageId);

    if (messageUpdateError) {
      console.error(
        "Supabase transcription completion update error:",
        messageUpdateError
      );
    }

    const { data: currentConversation, error: conversationFetchError } =
      await supabaseAdmin
        .from("conversations")
        .select("last_message_id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

    if (conversationFetchError) {
      console.error(
        "Supabase current conversation fetch error:",
        conversationFetchError
      );
    }

    const isStillLatestMessage =
      currentConversation?.last_message_id === messageId;

    if (isStillLatestMessage) {
      const { error: conversationUpdateError } = await supabaseAdmin
        .from("conversations")
        .update({
          last_message_text: transcription,
          last_message_direction: direction,
          last_message_type: "audio",
          updated_at: transcribedAt,
        })
        .eq("conversation_id", conversationId)
        .eq("last_message_id", messageId);

      if (conversationUpdateError) {
        console.error(
          "Supabase conversation transcription update error:",
          conversationUpdateError
        );
      }
    } else {
      console.log(
        "Transcription saved, but conversation has a newer message:",
        {
          messageId,
          conversationId,
          currentLastMessageId: currentConversation?.last_message_id,
        }
      );
    }

    console.log("Audio transcribed successfully:", {
      messageId,
      conversationId,
      direction,
      transcription,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown transcription error";

    console.error("Audio transcription error:", {
      messageId,
      conversationId,
      error: errorMessage,
    });

    const { error: failedUpdateError } = await supabaseAdmin
      .from("messages")
      .update({
        transcription_status: "failed",
        transcription_error: errorMessage,
      })
      .eq("message_id", messageId);

    if (failedUpdateError) {
      console.error(
        "Supabase transcription failed update error:",
        failedUpdateError
      );
    }
  }
}

async function upsertMessage(params: {
  event: InstagramMessagingEvent;
  body: MetaWebhookBody;
}) {
  const { event, body } = params;
  const supabaseAdmin = getSupabaseAdmin();

  const message = event.message;

  if (!message?.mid) {
    return;
  }

  const parts = getConversationParts(event);

  if (!parts) {
    return;
  }

  const direction = parts.isEcho ? "outbound" : "inbound";
  const sentAt: string | null = msToIso(event.timestamp);
  const messageType = getMessageType(event);
  const attachmentUrl = getAttachmentUrl(event);
  const isAudio = messageType === "audio" && Boolean(attachmentUrl);

  const visibleMessageText =
    message.text ||
    (isAudio ? "[Nota de voz]" : `[Adjunto: ${messageType}]`);

  const { data: existingMessage, error: existingMessageError } =
    await supabaseAdmin
      .from("messages")
      .select("transcription_status, transcription")
      .eq("message_id", message.mid)
      .maybeSingle();

  if (existingMessageError) {
    console.error(
      "Supabase existing message fetch error:",
      existingMessageError
    );
  }

  const initialTranscriptionStatus =
    isAudio && existingMessage?.transcription_status !== "completed"
      ? "pending"
      : existingMessage?.transcription_status || null;

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
      message_type: messageType,
      attachment_type: messageType === "text" ? null : messageType,
      attachment_url: attachmentUrl,
      transcription: existingMessage?.transcription || null,
      transcription_status: initialTranscriptionStatus,
    },
    {
      onConflict: "message_id",
    }
  );

  if (messageError) {
    console.error("Supabase messages upsert error:", messageError);
  }

  const conversationUpdate: Record<string, unknown> =
    direction === "inbound"
      ? {
          conversation_id: parts.conversationId,
          ig_account_id: parts.igAccountId,
          external_user_id: parts.externalUserId,
          status: "pending",
          needs_response: true,
          last_user_message_at: sentAt,
          last_message_id: message.mid,
          last_message_type: messageType,
          last_message_text:
            existingMessage?.transcription || visibleMessageText,
          last_message_direction: direction,
          updated_at: sentAt || new Date().toISOString(),
        }
      : {
          conversation_id: parts.conversationId,
          ig_account_id: parts.igAccountId,
          external_user_id: parts.externalUserId,
          status: "answered",
          needs_response: false,
          last_business_reply_at: sentAt,
          last_message_id: message.mid,
          last_message_type: messageType,
          last_message_text:
            existingMessage?.transcription || visibleMessageText,
          last_message_direction: direction,
          last_human_reply_at: sentAt,
          last_outbound_type: "human",
          updated_at: sentAt || new Date().toISOString(),
        };

  const { error: conversationError } = await supabaseAdmin
    .from("conversations")
    .upsert(conversationUpdate, {
      onConflict: "conversation_id",
    });

  if (conversationError) {
    console.error("Supabase conversations upsert error:", conversationError);
  }

  if (direction === "inbound") {
    await fetchAndUpdateProfileIfNeeded({
      conversationId: parts.conversationId,
      externalUserId: parts.externalUserId,
    });
  }

  if (isAudio && attachmentUrl) {
    await transcribeAndSaveAudio({
      messageId: message.mid,
      conversationId: parts.conversationId,
      audioUrl: attachmentUrl,
      direction,
    });
  }
}

async function saveReadEvent(params: {
  event: InstagramMessagingEvent;
  body: MetaWebhookBody;
}) {
  const { event, body } = params;
  const supabaseAdmin = getSupabaseAdmin();

  const read = event.read;

  if (!read) {
    return;
  }

  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;

  if (!senderId || !recipientId) {
    return;
  }

  const igAccountId = recipientId;
  const externalUserId = senderId;
  const conversationId = `${igAccountId}:${externalUserId}`;
  const readAt: string | null = msToIso(event.timestamp);

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

  const seenUpdate: Record<string, unknown> = {
    conversation_id: conversationId,
    ig_account_id: igAccountId,
    external_user_id: externalUserId,
    last_seen_at: readAt,
    last_seen_message_id: read.mid || null,
    last_seen_by: senderId,
    updated_at: new Date().toISOString(),
  };

  const { error: conversationError } = await supabaseAdmin
    .from("conversations")
    .upsert(seenUpdate, {
      onConflict: "conversation_id",
    });

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
    const body = (await req.json()) as MetaWebhookBody;

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
          const messageType = getMessageType(event);

          console.log("PARSED MESSAGE EVENT:", {
            event_type: "message",
            direction,
            isEcho,
            messageType,
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
            messageId: message.mid,
            text: message.text || null,
            attachmentCount: message.attachments?.length || 0,
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

    return NextResponse.json(
      {
        received: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        error: "Invalid payload",
      },
      { status: 400 }
    );
  }
}