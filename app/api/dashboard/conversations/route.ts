import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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
        last_message_text,
        last_message_direction,
        last_user_message_at,
        last_business_reply_at,
        updated_at,
        category,
        priority,
        summary,
        next_action,
        assigned_to
      `
      )
      .order("updated_at", { ascending: false })
      .limit(100);

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