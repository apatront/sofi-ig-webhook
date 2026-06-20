import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Conversation = {
  conversation_id: string;
  external_username: string | null;
  external_name: string | null;

  contact_type: string | null;
  is_discarded: boolean | null;

  status: string | null;
  queue: string | null;
  category: string | null;

  needs_response: boolean | null;
  needs_resolution_review: boolean | null;

  needs_sofi: boolean | null;
  needs_admin: boolean | null;
  assigned_to: string | null;

  lead_score: number | null;
  urgency_score: number | null;
  sort_score: number | null;

  summary: string | null;
  resolution_status: string | null;
  resolution_alert: string | null;

  last_user_message_at: string | null;
  updated_at: string | null;
  resolved_at: string | null;
  discarded_at: string | null;
};

type QueueName = "hot" | "sofi" | "admin" | "unassigned";

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function truncateText(value: string, maxLength: number) {
  const cleanValue = value.trim();

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, maxLength - 1).trim()}…`;
}

function getDisplayName(conversation: Conversation) {
  if (conversation.external_username) {
    return `@${conversation.external_username}`;
  }

  if (conversation.external_name) {
    return conversation.external_name;
  }

  return "Usuario desconocido";
}

function isPersonal(conversation: Conversation) {
  return (
    normalize(conversation.contact_type) === "personal" ||
    normalize(conversation.queue) === "personal" ||
    normalize(conversation.category) === "personal"
  );
}

function isDiscarded(conversation: Conversation) {
  return (
    conversation.is_discarded === true ||
    normalize(conversation.queue) === "discarded" ||
    normalize(conversation.category) === "discarded"
  );
}

function isResolved(conversation: Conversation) {
  if (isPersonal(conversation) || isDiscarded(conversation)) {
    return false;
  }

  return (
    normalize(conversation.resolution_status) === "resolved" ||
    normalize(conversation.status) === "closed"
  );
}

function isActive(conversation: Conversation) {
  if (
    isPersonal(conversation) ||
    isDiscarded(conversation) ||
    isResolved(conversation)
  ) {
    return false;
  }

  const status = normalize(conversation.status);
  const resolutionStatus = normalize(
    conversation.resolution_status
  );

  return Boolean(
    conversation.needs_response ||
      conversation.needs_resolution_review ||
      ["pending", "bot_answered"].includes(status) ||
      [
        "pending_response",
        "answered_pending_resolution",
        "needs_follow_up",
      ].includes(resolutionStatus)
  );
}

function getQueue(conversation: Conversation): QueueName {
  const queue = normalize(conversation.queue);
  const assignedTo = normalize(conversation.assigned_to);

  if (queue === "urgent") {
    return "hot";
  }

  if (
    queue === "sofi" ||
    conversation.needs_sofi ||
    assignedTo === "sofi"
  ) {
    return "sofi";
  }

  if (
    queue === "admin" ||
    conversation.needs_admin ||
    assignedTo === "admin"
  ) {
    return "admin";
  }

  return "unassigned";
}

function getWaitingMinutes(conversation: Conversation) {
  const sourceDate =
    conversation.last_user_message_at ||
    conversation.updated_at;

  if (!sourceDate) {
    return 0;
  }

  const timestamp = new Date(sourceDate).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60000)
  );
}

function formatWaitingTime(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours} h ${remainingMinutes} min`
      : `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0
    ? `${days} d ${remainingHours} h`
    : `${days} d`;
}

function getMexicoCityDateParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: Number(getPart("hour")),
    minute: getPart("minute"),
  };
}

function getStartOfTodayMexicoCity() {
  const { year, month, day } = getMexicoCityDateParts();

  return new Date(
    `${year}-${month}-${day}T00:00:00-06:00`
  ).toISOString();
}

function getSummaryTitle(hour: number) {
  if (hour < 12) {
    return "☀️ LOKI ALL IN — RESUMEN DE LA MAÑANA";
  }

  if (hour < 18) {
    return "📍 LOKI ALL IN — CORTE DEL MEDIODÍA";
  }

  return "🌙 LOKI ALL IN — CIERRE DEL INBOX";
}

function getOperationalScore(conversation: Conversation) {
  const waitingMinutes = getWaitingMinutes(conversation);

  return (
    (conversation.sort_score || 0) * 10 +
    (conversation.urgency_score || 0) * 3 +
    (conversation.lead_score || 0) * 2 +
    Math.min(waitingMinutes, 600)
  );
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort(
    (a, b) =>
      getOperationalScore(b) - getOperationalScore(a)
  );
}

function buildConversationLines(
  conversations: Conversation[],
  limit: number
) {
  const visible = conversations.slice(0, limit);

  if (visible.length === 0) {
    return "• Sin conversaciones pendientes";
  }

  const lines = visible.map((conversation) => {
    const name = escapeHtml(getDisplayName(conversation));

    const waitingTime = formatWaitingTime(
      getWaitingMinutes(conversation)
    );

    const summary = escapeHtml(
      truncateText(
        conversation.summary?.trim() ||
          conversation.resolution_alert?.trim() ||
          "Sin resumen disponible",
        180
      )
    );

    return [
      `• <b>${name}</b> — ${summary}`,
      `  ⏳ Esperando: ${waitingTime}`,
    ].join("\n");
  });

  if (conversations.length > limit) {
    lines.push(
      `\n+ ${conversations.length - limit} conversaciones adicionales`
    );
  }

  return lines.join("\n");
}

async function sendTelegramSummary() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const messageThreadIdValue =
    process.env.TELEGRAM_MESSAGE_THREAD_ID;

  const dashboardUrl =
    process.env.LOKI_DASHBOARD_URL ||
    "https://sofi-ig-webhook.vercel.app/dashboard-horizontal";

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID is missing");
  }

  let messageThreadId: number | undefined;

  if (messageThreadIdValue) {
    const parsedMessageThreadId = Number(messageThreadIdValue);

    if (
      !Number.isInteger(parsedMessageThreadId) ||
      parsedMessageThreadId <= 0
    ) {
      throw new Error(
        "TELEGRAM_MESSAGE_THREAD_ID must be a positive integer"
      );
    }

    messageThreadId = parsedMessageThreadId;
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select(
      `
      conversation_id,
      external_username,
      external_name,

      contact_type,
      is_discarded,

      status,
      queue,
      category,

      needs_response,
      needs_resolution_review,

      needs_sofi,
      needs_admin,
      assigned_to,

      lead_score,
      urgency_score,
      sort_score,

      summary,
      resolution_status,
      resolution_alert,

      last_user_message_at,
      updated_at,
      resolved_at,
      discarded_at
    `
    )
    .limit(500);

  if (error) {
    throw new Error(
      `Failed to load conversations: ${error.message}`
    );
  }

  const conversations = (data || []) as Conversation[];

  const active = conversations.filter(isActive);

  const hot = sortConversations(
    active.filter(
      (conversation) => getQueue(conversation) === "hot"
    )
  );

  const sofi = sortConversations(
    active.filter(
      (conversation) => getQueue(conversation) === "sofi"
    )
  );

  const admin = sortConversations(
    active.filter(
      (conversation) => getQueue(conversation) === "admin"
    )
  );

  const unassigned = sortConversations(
    active.filter(
      (conversation) =>
        getQueue(conversation) === "unassigned"
    )
  );

  const startOfToday = new Date(
    getStartOfTodayMexicoCity()
  ).getTime();

  const resolvedToday = conversations.filter((conversation) => {
    if (!conversation.resolved_at) {
      return false;
    }

    return (
      new Date(conversation.resolved_at).getTime() >=
      startOfToday
    );
  });

  const discardedToday = conversations.filter(
    (conversation) => {
      if (!conversation.discarded_at) {
        return false;
      }

      return (
        new Date(conversation.discarded_at).getTime() >=
        startOfToday
      );
    }
  );

  const longWaitingHot = hot.filter(
    (conversation) =>
      getWaitingMinutes(conversation) >= 60
  );

  const longWaitingSofi = sofi.filter(
    (conversation) =>
      getWaitingMinutes(conversation) >= 180
  );

  const longWaitingAdmin = admin.filter(
    (conversation) =>
      getWaitingMinutes(conversation) >= 180
  );

  const incompleteResponses = active.filter(
    (conversation) =>
      normalize(conversation.resolution_status) ===
        "answered_pending_resolution" ||
      Boolean(conversation.needs_resolution_review)
  );

  const { hour, minute } = getMexicoCityDateParts();

  const text = [
    `<b>${getSummaryTitle(hour)}</b>`,
    `🕒 ${String(hour).padStart(2, "0")}:${minute} · Ciudad de México`,
    "",
    "<b>📊 PANORAMA GENERAL</b>",
    "",
    `🔥 Hot leads: <b>${hot.length}</b>`,
    `👤 Pendientes de Sofi: <b>${sofi.length}</b>`,
    `🎧 Pendientes de Admin: <b>${admin.length}</b>`,
    `📥 Sin asignar: <b>${unassigned.length}</b>`,
    `⏳ Total pendiente: <b>${active.length}</b>`,
    "",
    "<b>🔥 HOT LEADS</b>",
    "",
    buildConversationLines(hot, 5),
    "",
    "<b>👤 SOFI</b>",
    "",
    buildConversationLines(sofi, 3),
    "",
    "<b>🎧 ADMIN</b>",
    "",
    buildConversationLines(admin, 3),
    "",
    "<b>⚠️ ATENCIÓN</b>",
    "",
    `• Hot leads esperando más de 1 hora: <b>${longWaitingHot.length}</b>`,
    `• Pendientes de Sofi por más de 3 horas: <b>${longWaitingSofi.length}</b>`,
    `• Pendientes de Admin por más de 3 horas: <b>${longWaitingAdmin.length}</b>`,
    `• Conversaciones sin asignar: <b>${unassigned.length}</b>`,
    `• Respuestas incompletas: <b>${incompleteResponses.length}</b>`,
    "",
    "<b>✅ MOVIMIENTO DE HOY</b>",
    "",
    `• Resueltas: <b>${resolvedToday.length}</b>`,
    `• Descartadas: <b>${discardedToday.length}</b>`,
  ].join("\n");

  const telegramPayload: {
    chat_id: string;
    message_thread_id?: number;
    text: string;
    parse_mode: "HTML";
    disable_web_page_preview: boolean;
    reply_markup: {
      inline_keyboard: Array<
        Array<{
          text: string;
          url: string;
        }>
      >;
    };
  } = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Abrir Loki All In",
            url: dashboardUrl,
          },
        ],
      ],
    },
  };

  if (messageThreadId !== undefined) {
    telegramPayload.message_thread_id = messageThreadId;
  }

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(telegramPayload),
    }
  );

  const telegramBody = await telegramResponse.json();

  if (!telegramResponse.ok || telegramBody.ok !== true) {
    throw new Error(
      telegramBody.description ||
        "Telegram rejected the summary message"
    );
  }

  return {
    ok: true,
    telegram: {
      chat_id: chatId,
      message_thread_id: messageThreadId || null,
      message_id:
        telegramBody.result?.message_id || null,
    },
    counts: {
      active: active.length,
      hot: hot.length,
      sofi: sofi.length,
      admin: admin.length,
      unassigned: unassigned.length,
      resolved_today: resolvedToday.length,
      discarded_today: discardedToday.length,
    },
  };
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization =
    request.headers.get("authorization");

  return authorization === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const result = await sendTelegramSummary();

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unexpected server error";

    console.error(
      "Telegram inbox summary error:",
      errorMessage
    );

    return NextResponse.json(
      {
        error: "Failed to send Telegram inbox summary",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}