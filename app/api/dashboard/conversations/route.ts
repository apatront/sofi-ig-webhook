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

        lead_score,
        urgency_score,
        sort_score,

        summary,
        next_action,
        ai_reasoning,
        last_ai_analysis_at,

        conversation_stage,
        conversion_status,
        estimated_value,
        customer_status,

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
      console.error("Dashboard conversations fetch error:", error);

      return NextResponse.json(
        {
          error: "Failed to fetch conversations",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversations: data || [],
    });
  } catch (error) {
    console.error("Dashboard conversations route error:", error);

    return NextResponse.json(
      {
        error: "Unexpected server error",
      },
      { status: 500 }
    );
  }
}