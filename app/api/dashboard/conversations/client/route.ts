import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ClientBody = {
  conversation_id?: string;
  is_client?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClientBody;

    const conversationId = body.conversation_id;
    const isClient = body.is_client === true;

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

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .update({
        is_client: isClient,
        client_marked_at: isClient ? now : null,
        client_marked_by: isClient ? "dashboard" : null,
        customer_status: isClient ? "customer" : "unknown",
        updated_at: now,
      })
      .eq("conversation_id", conversationId)
      .select(
        `
        conversation_id,
        is_client,
        client_marked_at,
        client_marked_by,
        customer_status,
        updated_at
      `
      )
      .single();

    if (error) {
      console.error("Client status update error:", error);

      return NextResponse.json(
        {
          error: "Failed to update client status",
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

    console.error("Client status route error:", errorMessage);

    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
