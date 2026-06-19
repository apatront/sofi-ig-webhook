import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { analyzeConversationById } from "@/lib/analyzeConversation";

function isAuthorized(req: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_SECRET;
  const authorization = req.headers.get("authorization");

  if (!expectedSecret) {
    console.error("Missing AUTOMATION_SECRET");
    return false;
  }

  return authorization === `Bearer ${expectedSecret}`;
}

async function runPendingAnalysis(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") || 5);

  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 5, 1),
    10
  );

  const { data: conversations, error: conversationsError } =
    await supabaseAdmin
      .from("conversations")
      .select("conversation_id, updated_at")
      .eq("ai_analysis_status", "pending")
      .not("last_message_id", "is", null)
      .order("updated_at", { ascending: true })
      .limit(limit);

  if (conversationsError) {
    console.error(
      "Failed to fetch pending conversations:",
      conversationsError
    );

    return NextResponse.json(
      {
        error: conversationsError.message,
      },
      { status: 500 }
    );
  }

  const completed: Array<Record<string, unknown>> = [];
  const deferred: Array<Record<string, unknown>> = [];
  const failed: Array<Record<string, unknown>> = [];

  for (const conversation of conversations || []) {
    try {
      const result = await analyzeConversationById(
        conversation.conversation_id
      );

      if (result.deferred) {
        deferred.push({
          conversation_id: conversation.conversation_id,
          reason: result.reason,
        });

        continue;
      }

      completed.push({
        conversation_id: conversation.conversation_id,
        queue: result.classification.queue,
        priority: result.classification.priority,
        sort_score: result.classification.sort_score,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown analysis error";

      failed.push({
        conversation_id: conversation.conversation_id,
        error: errorMessage,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    requested_limit: limit,
    found: conversations?.length || 0,
    completed_count: completed.length,
    deferred_count: deferred.length,
    failed_count: failed.length,
    completed,
    deferred,
    failed,
  });
}

export async function GET(req: NextRequest) {
  return runPendingAnalysis(req);
}

export async function POST(req: NextRequest) {
  return runPendingAnalysis(req);
}