type ConversationClassification = {
  queue: "urgent" | "sofi" | "admin" | "general";
  category:
    | "high_ticket"
    | "low_ticket"
    | "clienta_actual"
    | "soporte"
    | "testimonio"
    | "colaboracion"
    | "admin"
    | "casual"
    | "spam"
    | "otro";
  priority: "high" | "medium" | "low";
  intent:
    | "ready_to_buy"
    | "wants_price"
    | "wants_call"
    | "wants_link"
    | "wants_more_info"
    | "payment_question"
    | "objection"
    | "technical_support"
    | "access_problem"
    | "complaint"
    | "sharing_result"
    | "collaboration"
    | "casual_reply"
    | "unknown";
  sentiment:
    | "positive"
    | "interested"
    | "neutral"
    | "confused"
    | "frustrated"
    | "negative";
  product: string;
  objection: string;
  needs_sofi: boolean;
  needs_admin: boolean;
  assigned_to: "sofi" | "admin" | "unassigned";
  lead_score: number;
  urgency_score: number;
  summary: string;
  next_action: string;
  ai_reasoning: string;
  conversation_stage:
    | "new"
    | "qualified"
    | "considering"
    | "ready_to_buy"
    | "follow_up"
    | "customer_support"
    | "resolved";
  customer_status:
    | "prospect"
    | "lead"
    | "client"
    | "former_client"
    | "unknown";
};

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

function extractOutputText(response: ResponsesApiResult): string {
  if (response.output_text) {
    return response.output_text;
  }

  for (const outputItem of response.output || []) {
    for (const contentItem of outputItem.content || []) {
      if (contentItem.type === "output_text" && contentItem.text) {
        return contentItem.text;
      }

      if (contentItem.refusal) {
        throw new Error(`OpenAI refused classification: ${contentItem.refusal}`);
      }
    }
  }

  throw new Error("OpenAI returned no classification output");
}

export async function classifyConversation(params: {
  transcript: string;
  externalName?: string | null;
  externalUsername?: string | null;
  followsBusiness?: boolean | null;
  businessFollowsUser?: boolean | null;
  isVerified?: boolean | null;
}): Promise<ConversationClassification> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model =
    process.env.OPENAI_CLASSIFIER_MODEL || "gpt-4.1-mini";

  const profileContext = {
    name: params.externalName || null,
    username: params.externalUsername || null,
    follows_sofi: params.followsBusiness ?? null,
    sofi_follows_user: params.businessFollowsUser ?? null,
    verified: params.isVerified ?? null,
  };

  const instructions = `
Eres el clasificador operativo del inbox de Instagram de Sofi.

Tu trabajo es ayudar a aumentar conversiones, proteger la experiencia de las
clientas y asignar cada conversación a la persona correcta.

NEGOCIO Y RESPONSABLES

SOFI debe atender:
- prospectas high-ticket;
- personas listas para comprar;
- objeciones importantes;
- testimonios o logros valiosos;
- colaboraciones;
- conversaciones sensibles o relacionales;
- situaciones donde su voz personal pueda generar confianza o cerrar.

ADMIN debe atender:
- accesos;
- links;
- pagos ya realizados;
- facturación;
- logística;
- soporte técnico;
- calendarios;
- reembolsos;
- problemas operativos;
- dudas de clientas actuales que no requieren la voz personal de Sofi.

URGENT se usa solamente cuando existe una razón concreta:
- intención clara e inmediata de compra;
- pago fallido o bloqueo de acceso;
- clienta molesta;
- queja;
- riesgo de pérdida comercial;
- problema sensible que puede empeorar al esperar;
- fecha límite cercana.

No marques como urgente un saludo, reacción, agradecimiento o curiosidad general.

REGLAS DE SCORING

lead_score:
- 90–100: quiere comprar o solicita link/pago/llamada;
- 70–89: interés comercial claro;
- 40–69: interés posible, falta información;
- 0–39: soporte, casual, spam o sin intención comercial.

urgency_score:
- 85–100: compra inmediata, queja seria, pago/acceso bloqueado;
- 65–84: requiere respuesta rápida;
- 35–64: importante pero puede esperar;
- 0–34: baja urgencia.

Analiza el contexto completo. Los mensajes marcados como BOT no equivalen a
una respuesta humana. No inventes productos, precios, problemas ni intención.
Mantén summary y next_action breves y accionables, en español.
`.trim();

  const input = `
PERFIL:
${JSON.stringify(profileContext, null, 2)}

CONVERSACIÓN, ORDENADA DE MÁS ANTIGUA A MÁS RECIENTE:
${params.transcript}
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      temperature: 0.1,
      text: {
        format: {
          type: "json_schema",
          name: "conversation_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              queue: {
                type: "string",
                enum: ["urgent", "sofi", "admin", "general"],
              },
              category: {
                type: "string",
                enum: [
                  "high_ticket",
                  "low_ticket",
                  "clienta_actual",
                  "soporte",
                  "testimonio",
                  "colaboracion",
                  "admin",
                  "casual",
                  "spam",
                  "otro",
                ],
              },
              priority: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
              intent: {
                type: "string",
                enum: [
                  "ready_to_buy",
                  "wants_price",
                  "wants_call",
                  "wants_link",
                  "wants_more_info",
                  "payment_question",
                  "objection",
                  "technical_support",
                  "access_problem",
                  "complaint",
                  "sharing_result",
                  "collaboration",
                  "casual_reply",
                  "unknown",
                ],
              },
              sentiment: {
                type: "string",
                enum: [
                  "positive",
                  "interested",
                  "neutral",
                  "confused",
                  "frustrated",
                  "negative",
                ],
              },
              product: {
                type: "string",
              },
              objection: {
                type: "string",
              },
              needs_sofi: {
                type: "boolean",
              },
              needs_admin: {
                type: "boolean",
              },
              assigned_to: {
                type: "string",
                enum: ["sofi", "admin", "unassigned"],
              },
              lead_score: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },
              urgency_score: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },
              summary: {
                type: "string",
              },
              next_action: {
                type: "string",
              },
              ai_reasoning: {
                type: "string",
              },
              conversation_stage: {
                type: "string",
                enum: [
                  "new",
                  "qualified",
                  "considering",
                  "ready_to_buy",
                  "follow_up",
                  "customer_support",
                  "resolved",
                ],
              },
              customer_status: {
                type: "string",
                enum: [
                  "prospect",
                  "lead",
                  "client",
                  "former_client",
                  "unknown",
                ],
              },
            },
            required: [
              "queue",
              "category",
              "priority",
              "intent",
              "sentiment",
              "product",
              "objection",
              "needs_sofi",
              "needs_admin",
              "assigned_to",
              "lead_score",
              "urgency_score",
              "summary",
              "next_action",
              "ai_reasoning",
              "conversation_stage",
              "customer_status",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `OpenAI classification failed. Status: ${response.status}. Body: ${errorBody}`
    );
  }

  const responseJson = (await response.json()) as ResponsesApiResult;
  const outputText = extractOutputText(responseJson);

  return JSON.parse(outputText) as ConversationClassification;
}