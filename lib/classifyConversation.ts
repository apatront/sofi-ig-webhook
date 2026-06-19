type Queue = "urgent" | "sofi" | "admin" | "general";

type Category =
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

type Priority = "high" | "medium" | "low";

type Intent =
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

type Sentiment =
  | "positive"
  | "neutral"
  | "confused"
  | "frustrated"
  | "negative";

type AssignedTo = "sofi" | "admin" | "unassigned";

type ConversationStage =
  | "new"
  | "exploring"
  | "qualified"
  | "decision"
  | "customer"
  | "support"
  | "closed";

type CustomerStatus =
  | "prospect"
  | "lead"
  | "customer"
  | "former_customer"
  | "unknown";

export type ResolutionStatus =
  | "pending_response"
  | "answered_pending_resolution"
  | "needs_follow_up"
  | "resolved";

export type ConversationClassification = {
  queue: Queue;
  category: Category;
  priority: Priority;
  intent: Intent;
  sentiment: Sentiment;

  product: string;
  objection: string;

  needs_sofi: boolean;
  needs_admin: boolean;
  assigned_to: AssignedTo;

  lead_score: number;
  urgency_score: number;

  summary: string;
  next_action: string;
  ai_reasoning: string;

  conversation_stage: ConversationStage;
  customer_status: CustomerStatus;

  resolution_status: ResolutionStatus;
  open_requests: string[];
  unresolved_items: string[];
  resolution_reason: string;
  resolution_alert: string;
  needs_resolution_review: boolean;
};

type ClassifyConversationInput = {
  transcript: string;
  externalName: string | null;
  externalUsername: string | null;
  followsBusiness: boolean | null;
  businessFollowsUser: boolean | null;
  isVerified: boolean | null;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const classificationSchema = {
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
      enum: ["positive", "neutral", "confused", "frustrated", "negative"],
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
        "exploring",
        "qualified",
        "decision",
        "customer",
        "support",
        "closed",
      ],
    },
    customer_status: {
      type: "string",
      enum: [
        "prospect",
        "lead",
        "customer",
        "former_customer",
        "unknown",
      ],
    },

    resolution_status: {
      type: "string",
      enum: [
        "pending_response",
        "answered_pending_resolution",
        "needs_follow_up",
        "resolved",
      ],
    },
    open_requests: {
      type: "array",
      items: {
        type: "string",
      },
    },
    unresolved_items: {
      type: "array",
      items: {
        type: "string",
      },
    },
    resolution_reason: {
      type: "string",
    },
    resolution_alert: {
      type: "string",
    },
    needs_resolution_review: {
      type: "boolean",
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
    "resolution_status",
    "open_requests",
    "unresolved_items",
    "resolution_reason",
    "resolution_alert",
    "needs_resolution_review",
  ],
};

function getOutputText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  for (const outputItem of response.output || []) {
    for (const contentItem of outputItem.content || []) {
      if (contentItem.type === "output_text" && contentItem.text) {
        return contentItem.text;
      }
    }
  }

  return null;
}

export async function classifyConversation(
  input: ClassifyConversationInput
): Promise<ConversationClassification> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model =
    process.env.OPENAI_CLASSIFIER_MODEL?.trim() || "gpt-4.1-mini";

  const systemPrompt = `
Eres el sistema de inteligencia operativa del inbox de Instagram de Sofi.

Tu trabajo tiene dos objetivos:

1. Clasificar la conversación para determinar quién debe atenderla.
2. Evaluar si las solicitudes de la persona fueron realmente resueltas.

Lee toda la conversación en orden cronológico.

Los participantes pueden aparecer como:

- USUARIO: la persona externa.
- SOFI/EQUIPO: una respuesta humana enviada desde Instagram.
- BOT MANYCHAT: una respuesta automática.

REGLA FUNDAMENTAL:

Una respuesta no significa automáticamente que la solicitud quedó resuelta.

Ejemplo:

USUARIO: ¿Cuánto cuesta y cómo aparto?
SOFI/EQUIPO: Sí, ahorita te contestamos.

Esto NO está resuelto.

Debe resultar en:

- resolution_status: answered_pending_resolution
- open_requests: precio y forma de apartado
- unresolved_items: precio y forma de apartado
- needs_resolution_review: true
- resolution_alert: una alerta clara indicando lo que todavía falta

DEFINICIONES DE RESOLUCIÓN:

pending_response:
La persona hizo una solicitud y todavía no existe una respuesta humana útil.

answered_pending_resolution:
Existe respuesta humana, pero fue únicamente acuse, saludo, promesa de responder,
mensaje parcial o no contestó todos los puntos.

needs_follow_up:
La respuesta fue útil, pero quedó una acción futura pendiente.
Ejemplos: enviar enlace más tarde, confirmar disponibilidad, revisar un pago,
consultar con alguien o volver a contactar.

resolved:
La respuesta humana atendió claramente todas las solicitudes actuales,
o la persona confirmó que ya quedó resuelto.

No marques resolved únicamente porque:
- hubo un mensaje saliente;
- dijeron "ahorita te contestamos";
- dijeron "claro", "sí", "perfecto" o algo similar;
- ManyChat respondió;
- se envió una respuesta que no contiene la información solicitada.

OPEN REQUESTS:

Extrae cada solicitud concreta que la persona espera que Sofi o el equipo atiendan.

Ejemplos:
- conocer el precio;
- recibir el enlace de pago;
- confirmar disponibilidad;
- resolver acceso;
- aclarar una duda;
- recibir seguimiento personal;
- revisar un cargo;
- saber cómo apartar.

UNRESOLVED ITEMS:

Incluye solamente los puntos que siguen sin resolverse después de revisar
todas las respuestas humanas posteriores.

RESOLUTION ALERT:

Si hay algo pendiente, genera una alerta breve, específica y accionable.

Ejemplo:
"Contestaste, pero todavía falta enviar el precio y explicar cómo apartar."

Si todo quedó resuelto, devuelve una cadena vacía.

ASIGNACIÓN:

queue = urgent:
Riesgo inmediato, clienta molesta, problema serio de pago, acceso urgente,
fecha límite próxima o lead de alta intención que requiere atención rápida.

queue = sofi:
Necesita criterio, cercanía, venta high-ticket, conversación sensible,
objeción importante, colaboración, testimonio o respuesta personal de Sofi.

queue = admin:
Pagos, accesos, links, facturas, logística, soporte operativo o seguimiento administrativo.

queue = general:
Conversación casual, reacción, agradecimiento o conversación sin acción importante.

needs_sofi:
true solamente cuando realmente se necesita una respuesta personal o criterio de Sofi.

needs_admin:
true cuando el equipo administrativo puede resolverlo.

assigned_to:
- sofi cuando debe atender Sofi.
- admin cuando debe atender administración.
- unassigned cuando no requiere asignación específica.

PUNTAJES:

lead_score:
0 a 100 según intención comercial real.

urgency_score:
0 a 100 según necesidad de actuar pronto.

No inventes información que no esté en el transcript.

Devuelve frases cortas, claras y útiles para un equipo operativo.
`.trim();

  const userPrompt = `
PERFIL

Nombre:
${input.externalName || "No disponible"}

Usuario:
${input.externalUsername || "No disponible"}

Sigue a la cuenta:
${input.followsBusiness === true ? "Sí" : input.followsBusiness === false ? "No" : "Desconocido"}

La cuenta sigue a esta persona:
${input.businessFollowsUser === true ? "Sí" : input.businessFollowsUser === false ? "No" : "Desconocido"}

Usuario verificado:
${input.isVerified === true ? "Sí" : input.isVerified === false ? "No" : "Desconocido"}

CONVERSACIÓN EN ORDEN CRONOLÓGICO

${input.transcript}
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userPrompt,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "instagram_conversation_classification",
          strict: true,
          schema: classificationSchema,
        },
      },
    }),
  });

  const rawResponse = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(
      rawResponse.error?.message ||
        `OpenAI request failed with status ${response.status}`
    );
  }

  const outputText = getOutputText(rawResponse);

  if (!outputText) {
    throw new Error("OpenAI returned no structured output");
  }

  let parsed: ConversationClassification;

  try {
    parsed = JSON.parse(outputText) as ConversationClassification;
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  return parsed;
}