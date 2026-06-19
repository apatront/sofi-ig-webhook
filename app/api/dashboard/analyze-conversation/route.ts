import { NextRequest, NextResponse } from "next/server";
import { analyzeConversationById } from "@/lib/analyzeConversation";

type AnalyzeConversationBody = {
  conversation_id?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeConversationBody;
    const conversationId = body.conversation_id;

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "conversation_id is required",
        },
        { status: 400 }
      );
    }

    const result = await analyzeConversationById(conversationId);

    if (result.deferred) {
      return NextResponse.json(result, {
        status: 202,
      });
    }

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown analysis error";

    console.error("Conversation analysis endpoint error:", errorMessage);

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}