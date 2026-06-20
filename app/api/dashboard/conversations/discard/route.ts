import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type DiscardBody = {
  conversation_id?: string;
  is_discarded?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DiscardBody;

    const conversationId = body.conversation_id;
    const isDiscarded = body.is_discarded === true;

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "conversation_id is required",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const nowDate = new Date();
    const now = nowDate.toISOString();

    const discardExpiresAt = new Date(
      nowDate.getTime() + 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: currentConversation, error: currentError } =
      await supabaseAdmin
        .from("conversations")
        .select(
          `
          conversation_id,
          contact_type,
          is_discarded
        `
        )
        .eq("conversation_id", conversationId)
        .maybeSingle();

    if (currentError) {
      return NextResponse.json(
        {
          error: "Failed to read conversation",
          details: currentError.message,
        },
        { status: 500 }
      );
    }

    if (!currentConversation) {
      return NextResponse.json(
        {
          error: "Conversation not found",
        },
        { status: 404 }
      );
    }

    const isPersonal =
      currentConversation.contact_type === "personal";

    const updatePayload = isDiscarded
      ? {
          is_discarded: true,
          discarded_at: now,
          discard_expires_at: discardExpiresAt,
          discarded_by: "dashboard",

          excluded_from_ai: true,
          queue: "discarded",
          category: "discarded",
          status: "answered",

          assigned_to: null,
          needs_sofi: false,
          needs_admin: false,
          needs_response: false,
          needs_resolution_review: false,

          ai_analysis_status: "excluded",
          ai_analysis_error: null,

          assignment_locked: true,
          assignment_source: "manual",

          updated_at: now,
        }
      : isPersonal
        ? {
            is_discarded: false,
            discarded_at: null,
            discard_expires_at: null,
            discarded_by: null,

            excluded_from_ai: true,
            queue: "personal",
            category: "personal",
            status: "answered",

            assigned_to: null,
            needs_sofi: false,
            needs_admin: false,
            needs_response: false,
            needs_resolution_review: false,

            resolution_status: "resolved",
            resolution_alert: null,
            unresolved_items: [],
            open_requests: [],

            ai_analysis_status: "excluded",
            ai_analysis_error: null,

            assignment_locked: true,
            assignment_source: "manual",

            updated_at: now,
          }
        : {
            is_discarded: false,
            discarded_at: null,
            discard_expires_at: null,
            discarded_by: null,

            excluded_from_ai: false,
            queue: null,
            category: null,
            status: "pending",

            assigned_to: null,
            needs_sofi: false,
            needs_admin: false,
            needs_response: true,
            needs_resolution_review: false,

            resolution_status: "pending_response",
            resolution_alert: null,
            unresolved_items: [],
            open_requests: [],

            ai_analysis_status: "pending",
            ai_analysis_error: null,

            assignment_locked: false,
            assignment_source: "ai",

            resolved_at: null,
            updated_at: now,
          };

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .update(updatePayload)
      .eq("conversation_id", conversationId)
      .select(
        `
        conversation_id,
        is_discarded,
        discarded_at,
        discard_expires_at,
        discarded_by,
        contact_type,
        excluded_from_ai,
        queue,
        category,
        status,
        assigned_to,
        needs_sofi,
        needs_admin,
        needs_response,
        needs_resolution_review,
        resolution_status,
        ai_analysis_status,
        assignment_locked,
        assignment_source,
        updated_at
      `
      )
      .single();

    if (error) {
      console.error(
        "Discard conversation update error:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to update discarded conversation",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      conversation: data,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unexpected server error";

    console.error(
      "Discard conversation route error:",
      errorMessage
    );

    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}