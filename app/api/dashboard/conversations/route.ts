import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select(
        `
        conversation_id,
        ig_account_id,
        external_user_id,
        external_username,
        external_name,
        external_profile_pic,
        is_user_follow_business,
        is_business_follow_user,
        is_verified_user,

        contact_type,
        excluded_from_ai,
        personal_marked_at,
        personal_marked_by,

        is_client,
        client_marked_at,
        client_marked_by,

        is_discarded,
        discarded_at,
        discard_expires_at,
        discarded_by,

        status,
        needs_response,
        queue,
        category,
        priority,
        intent,
        sentiment,
        objection,
        product,

        needs_sofi,
        needs_admin,
        assigned_to,
        assignment_locked,
        assignment_source,

        lead_score,
        urgency_score,
        sort_score,

        summary,
        next_action,
        ai_reasoning,
        last_ai_analysis_at,
        ai_analysis_status,
        ai_analyzed_message_id,
        ai_analysis_error,

        conversation_stage,
        conversion_status,
        estimated_value,
        customer_status,

        resolution_status,
        needs_resolution_review,
        open_requests,
        unresolved_items,
        resolution_reason,
        resolution_alert,
        resolution_reviewed_at,
        last_resolution_review_message_id,

        last_message_id,
        last_message_type,
        last_message_text,
        last_message_direction,

        last_user_message_at,
        last_business_reply_at,
        last_outbound_type,
        last_automation_reply_at,
        last_human_reply_at,

        first_response_at,
        follow_up_at,
        resolved_at,
        sla_due_at,

        created_at,
        updated_at
      `
      )
      .order("sort_score", {
        ascending: false,
        nullsFirst: false,
      })
      .order("updated_at", {
        ascending: false,
      })
      .limit(250);

    if (error) {
      console.error(
        "Dashboard conversations fetch error:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to fetch conversations",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        conversations: data || [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unexpected server error";

    console.error(
      "Dashboard conversations route error:",
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