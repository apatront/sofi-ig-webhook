import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { conversationId } = await context.params;

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "conversationId is required",
        },
        { status: 400 }
      );
    }

    const requestedLimit = Number(
      request.nextUrl.searchParams.get("limit") || 30
    );

    const limit = Math.min(
      Math.max(
        Number.isFinite(requestedLimit) ? requestedLimit : 30,
        1
      ),
      100
    );

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select(
        `
        message_id,
        direction,
        text,
        transcription,
        message_type,
        outbound_type,
        sent_at
      `
      )
      .eq("conversation_id", conversationId)
      .order("sent_at", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error("Conversation messages fetch error:", error);

      return NextResponse.json(
        {
          error: "Failed to fetch conversation messages",
          details: error.message,
        },
        { status: 500 }
      );
    }

    const messages = [...(data || [])].reverse();

    return NextResponse.json(
      {
        conversation_id: conversationId,
        messages,
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
      "Conversation messages route error:",
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
