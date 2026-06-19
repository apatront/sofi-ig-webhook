import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type AssignmentBody = {
  conversation_id?: string;
  assigned_to?: "sofi" | "admin";
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssignmentBody;

    const conversationId = body.conversation_id;
    const assignedTo = body.assigned_to;

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "conversation_id is required",
        },
        { status: 400 }
      );
    }

    if (!["sofi", "admin"].includes(assignedTo || "")) {
      return NextResponse.json(
        {
          error: "assigned_to must be sofi or admin",
        },
        { status: 400 }
      );
    }

    const isSofi = assignedTo === "sofi";
    const updatedAt = new Date().toISOString();

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .update({
        assigned_to: assignedTo,
        queue: assignedTo,

        needs_sofi: isSofi,
        needs_admin: !isSofi,

        assignment_locked: true,
        assignment_source: "manual",

        updated_at: updatedAt,
      })
      .eq("conversation_id", conversationId)
      .select(
        `
        conversation_id,
        assigned_to,
        queue,
        needs_sofi,
        needs_admin,
        assignment_locked,
        assignment_source,
        updated_at
      `
      )
      .single();

    if (error) {
      console.error("Conversation assignment error:", error);

      return NextResponse.json(
        {
          error: "Failed to assign conversation",
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

    console.error("Conversation assignment route error:", errorMessage);

    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}