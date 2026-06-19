import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { classifyConversation } from "@/lib/classifyConversation";

type MessageRow = {
  message_id: string;
  direction: string | null;
  text: string | null;
  transcription: string | null;
  transcription_status: string | null;
  message_type: string | null;
  sent_at: string | null;
  is_echo: boolean | null;
  outbound_type: string | null;
};

type ConversationRow = {
  conversation_id: string;
  external_username: string | null;
  external_name: string | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
  is_verified_user: boolean | null;

  status: string | null;
  needs_response: boolean | null;
  last_message_id: string | null;
  last_user_message_at: string | null;

  assignment_locked: boolean | null;
  assignment_source: string | null;
  assigned_to: string | null;
  queue: string | null;
  needs_sofi: boolean | null;
  needs_admin: boolean | null;

  contact_type: string | null;
  excluded_from_ai: boolean | null;
};

export type ConversationAnalysisResult =
  | {
      ok: true;
      deferred: false;
      conversation_id: string;
      analyzed_messages: number;
      classification: {
        queue: string;
        category: string;
        priority: string;
        intent: string;
        sentiment: string;

        product: string;
        objection: string;

        needs_sofi: boolean;
        needs_admin: boolean;
        assigned_to: string;

        lead_score: number;
        urgency_score: number;

        summary: string;
        next_action: string;
        ai_reasoning: string;

        conversation_stage: string;
        customer_status: string;

        resolution_status: string;
        open_requests: string[];
        unresolved_items: string[];
        resolution_reason: string;
        resolution_alert: string;
        needs_resolution_review: boolean;

        sort_score: number;
      };
    }
  | {
      ok: false;
      deferred: true;
      conversation_id: string;
      reason: string;
    };

function getEffectiveMessageText(message: MessageRow) {
  const text = message.text?.trim();
  const transcription = message.transcription?.trim();

  if (text) {
    return text;
  }

  if (transcription) {
    return transcription;
  }

  if (message.message_type === "audio") {
    return "[Nota de voz todavía sin transcripción]";
  }

  return `[Mensaje ${message.message_type || "sin contenido"}]`;
}

function buildTranscript(messages: MessageRow[]) {
  return messages
    .map((message) => {
      const isInbound = message.direction === "inbound";

      let speaker = isInbound ? "USUARIO" : "SOFI/EQUIPO";

      if (!isInbound && message.outbound_type === "automation") {
        speaker = "BOT MANYCHAT";
      }

      const typeLabel =
        message.message_type === "audio" ? " [NOTA DE VOZ]" : "";

      return `${speaker}${typeLabel}: ${getEffectiveMessageText(message)}`;
    })
    .join("\n");
}

function minutesSince(dateString: string | null) {
  if (!dateString) {
    return 0;
  }

  const timestamp = new Date(dateString).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

function calculateSortScore(params: {
  queue: string;
  category: string;
  priority: string;
  intent: string;
  needsSofi: boolean;
  needsAdmin: boolean;
  leadScore: number;
  urgencyScore: number;
  status: string | null;
  needsResponse: boolean | null;
  lastUserMessageAt: string | null;
  resolutionStatus: string;
}) {
  let score = 0;

  if (params.queue === "urgent") score += 200;
  if (params.queue === "sofi") score += 100;
  if (params.queue === "admin") score += 70;

  if (params.priority === "high") score += 100;
  if (params.priority === "medium") score += 40;

  if (params.category === "high_ticket") score += 80;

  if (params.needsSofi) score += 60;
  if (params.needsAdmin) score += 40;

  if (params.status === "bot_answered") score += 50;
  if (params.needsResponse) score += 40;

  if (
    ["ready_to_buy", "wants_price", "wants_call", "wants_link"].includes(
      params.intent
    )
  ) {
    score += 50;
  }

  if (params.resolutionStatus === "answered_pending_resolution") {
    score += 60;
  }

  if (params.resolutionStatus === "needs_follow_up") {
    score += 80;
  }

  if (params.resolutionStatus === "resolved") {
    score -= 500;
  }

  const waitingMinutes = minutesSince(params.lastUserMessageAt);

  if (waitingMinutes >= 180) score += 30;
  if (waitingMinutes >= 1440) score += 70;

  score += params.leadScore;
  score += params.urgencyScore;

  if (params.status === "closed") {
    score -= 500;
  }

  return score;
}

export async function analyzeConversationById(
  conversationId: string
): Promise<ConversationAnalysisResult> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data: conversation, error: conversationError } =
      await supabaseAdmin
        .from("conversations")
        .select(
          `
          conversation_id,
          external_username,
          external_name,
          is_user_follow_business,
          is_business_follow_user,
          is_verified_user,

          status,
          needs_response,
          last_message_id,
          last_user_message_at,

          assignment_locked,
          assignment_source,
          assigned_to,
          queue,
          needs_sofi,
          needs_admin,

          contact_type,
          excluded_from_ai
        `
        )
        .eq("conversation_id", conversationId)
        .maybeSingle();

    if (conversationError) {
      throw new Error(
        `Failed to fetch conversation: ${conversationError.message}`
      );
    }

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const typedConversation = conversation as ConversationRow;

    const isPersonal =
      typedConversation.contact_type === "personal" ||
      typedConversation.excluded_from_ai === true;

    if (isPersonal) {
      const { error: excludedUpdateError } = await supabaseAdmin
        .from("conversations")
        .update({
          contact_type: "personal",
          excluded_from_ai: true,
          category: "personal",
          queue: "personal",
          ai_analysis_status: "excluded",
          ai_analysis_error: null,
          needs_resolution_review: false,
        })
        .eq("conversation_id", conversationId);

      if (excludedUpdateError) {
        throw new Error(
          `Failed to preserve personal exclusion: ${excludedUpdateError.message}`
        );
      }

      return {
        ok: false,
        deferred: true,
        conversation_id: conversationId,
        reason: "Conversation is marked as personal and excluded from AI",
      };
    }

    if (!typedConversation.last_message_id) {
      return {
        ok: false,
        deferred: true,
        conversation_id: conversationId,
        reason: "Conversation does not have a last_message_id yet",
      };
    }

    const { data: latestMessage, error: latestMessageError } =
      await supabaseAdmin
        .from("messages")
        .select(
          `
          message_id,
          message_type,
          transcription_status,
          transcription
        `
        )
        .eq("message_id", typedConversation.last_message_id)
        .maybeSingle();

    if (latestMessageError) {
      throw new Error(
        `Failed to fetch latest message: ${latestMessageError.message}`
      );
    }

    if (
      latestMessage?.message_type === "audio" &&
      latestMessage?.transcription_status !== "completed"
    ) {
      return {
        ok: false,
        deferred: true,
        conversation_id: conversationId,
        reason: "Latest voice note is still being transcribed",
      };
    }

    const { error: processingError } = await supabaseAdmin
      .from("conversations")
      .update({
        ai_analysis_status: "processing",
        ai_analysis_error: null,
      })
      .eq("conversation_id", conversationId)
      .eq("excluded_from_ai", false)
      .neq("contact_type", "personal");

    if (processingError) {
      throw new Error(
        `Failed to mark analysis as processing: ${processingError.message}`
      );
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("messages")
      .select(
        `
        message_id,
        direction,
        text,
        transcription,
        transcription_status,
        message_type,
        sent_at,
        is_echo,
        outbound_type
      `
      )
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .limit(20);

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    const orderedMessages = ((messages || []) as MessageRow[]).reverse();

    if (orderedMessages.length === 0) {
      throw new Error("Conversation has no messages to analyze");
    }

    const transcript = buildTranscript(orderedMessages);

    const classification = await classifyConversation({
      transcript,
      externalName: typedConversation.external_name,
      externalUsername: typedConversation.external_username,
      followsBusiness: typedConversation.is_user_follow_business,
      businessFollowsUser: typedConversation.is_business_follow_user,
      isVerified: typedConversation.is_verified_user,
    });

    const { data: latestConversationState, error: latestStateError } =
      await supabaseAdmin
        .from("conversations")
        .select(
          `
          contact_type,
          excluded_from_ai,
          assignment_locked,
          assignment_source,
          assigned_to,
          queue,
          needs_sofi,
          needs_admin
        `
        )
        .eq("conversation_id", conversationId)
        .maybeSingle();

    if (latestStateError) {
      throw new Error(
        `Failed to verify conversation state: ${latestStateError.message}`
      );
    }

    if (
      latestConversationState?.contact_type === "personal" ||
      latestConversationState?.excluded_from_ai === true
    ) {
      await supabaseAdmin
        .from("conversations")
        .update({
          contact_type: "personal",
          excluded_from_ai: true,
          category: "personal",
          queue: "personal",
          ai_analysis_status: "excluded",
          ai_analysis_error: null,
          needs_resolution_review: false,
        })
        .eq("conversation_id", conversationId);

      return {
        ok: false,
        deferred: true,
        conversation_id: conversationId,
        reason:
          "Conversation was marked as personal while analysis was running",
      };
    }

    const assignmentIsLocked =
      latestConversationState?.assignment_locked === true;

    const effectiveQueue = assignmentIsLocked
      ? latestConversationState?.queue || classification.queue
      : classification.queue;

    const effectiveAssignedTo = assignmentIsLocked
      ? latestConversationState?.assigned_to || classification.assigned_to
      : classification.assigned_to;

    const effectiveNeedsSofi = assignmentIsLocked
      ? Boolean(latestConversationState?.needs_sofi)
      : classification.needs_sofi;

    const effectiveNeedsAdmin = assignmentIsLocked
      ? Boolean(latestConversationState?.needs_admin)
      : classification.needs_admin;

    const sortScore = calculateSortScore({
      queue: effectiveQueue,
      category: classification.category,
      priority: classification.priority,
      intent: classification.intent,
      needsSofi: effectiveNeedsSofi,
      needsAdmin: effectiveNeedsAdmin,
      leadScore: classification.lead_score,
      urgencyScore: classification.urgency_score,
      status: typedConversation.status,
      needsResponse: typedConversation.needs_response,
      lastUserMessageAt: typedConversation.last_user_message_at,
      resolutionStatus: classification.resolution_status,
    });

    const analyzedAt = new Date().toISOString();

    const updatePayload = {
      queue: effectiveQueue,
      category: classification.category,
      priority: classification.priority,
      intent: classification.intent,
      sentiment: classification.sentiment,

      product: classification.product || null,
      objection: classification.objection || null,

      needs_sofi: effectiveNeedsSofi,
      needs_admin: effectiveNeedsAdmin,
      assigned_to: effectiveAssignedTo,

      lead_score: classification.lead_score,
      urgency_score: classification.urgency_score,
      sort_score: sortScore,

      summary: classification.summary,
      next_action: classification.next_action,
      ai_reasoning: classification.ai_reasoning,

      conversation_stage: classification.conversation_stage,
      customer_status: classification.customer_status,

      resolution_status: classification.resolution_status,
      needs_resolution_review:
        classification.needs_resolution_review,
      open_requests: classification.open_requests,
      unresolved_items: classification.unresolved_items,
      resolution_reason: classification.resolution_reason || null,
      resolution_alert: classification.resolution_alert || null,
      resolution_reviewed_at: analyzedAt,
      last_resolution_review_message_id:
        typedConversation.last_message_id,

      last_ai_analysis_at: analyzedAt,
      ai_analysis_status: "completed",
      ai_analyzed_message_id: typedConversation.last_message_id,
      ai_analysis_error: null,

      assignment_source: assignmentIsLocked
        ? latestConversationState?.assignment_source || "manual"
        : "ai",

      updated_at: analyzedAt,
    };

    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update(updatePayload)
      .eq("conversation_id", conversationId)
      .eq("excluded_from_ai", false)
      .neq("contact_type", "personal");

    if (updateError) {
      throw new Error(
        `Failed to save classification: ${updateError.message}`
      );
    }

    return {
      ok: true,
      deferred: false,
      conversation_id: conversationId,
      analyzed_messages: orderedMessages.length,
      classification: {
        ...classification,
        queue: effectiveQueue,
        assigned_to: effectiveAssignedTo,
        needs_sofi: effectiveNeedsSofi,
        needs_admin: effectiveNeedsAdmin,
        sort_score: sortScore,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown analysis error";

    const { data: currentConversation } = await supabaseAdmin
      .from("conversations")
      .select("contact_type, excluded_from_ai")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    const isPersonal =
      currentConversation?.contact_type === "personal" ||
      currentConversation?.excluded_from_ai === true;

    await supabaseAdmin
      .from("conversations")
      .update({
        ai_analysis_status: isPersonal ? "excluded" : "failed",
        ai_analysis_error: isPersonal ? null : errorMessage,
      })
      .eq("conversation_id", conversationId);

    throw error;
  }
}