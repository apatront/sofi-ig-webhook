import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type PersonalBody = {
  conversation_id?: string;
  is_personal?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PersonalBody;

    const conversationId = body.conversation_id;
    const isPersonal = body.is_personal !== false;

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "conversation_id is required",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();

    const updatePayload = isPersonal
      ? {
          contact_type: "personal",
          excluded_from_ai: true,

          category: "personal",
          queue: "personal",
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

          personal_marked_at: now,
          personal_marked_by: "dashboard",
          resolved_at: now,
          updated_at: now,
        }
      : {
          contact_type: "business",
          excluded_from_ai: false,

          category: null,
          queue: null,
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

          personal_marked_at: null,
          personal_marked_by: null,
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
        contact_type,
        excluded_from_ai,
        category,
        queue,
        assigned_to,
        needs_sofi,
        needs_admin,
        needs_response,
        needs_resolution_review,
        resolution_status,
        ai_analysis_status,
        assignment_locked,
        assignment_source,
        personal_marked_at,
        updated_at
      `
      )
      .single();

    if (error) {
      console.error("Personal contact update error:", error);

      return NextResponse.json(
        {
          error: "Failed to update personal contact",
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
      error instanceof Error ? error.message : "Unexpected server error";

    console.error("Personal contact route error:", errorMessage);

    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}