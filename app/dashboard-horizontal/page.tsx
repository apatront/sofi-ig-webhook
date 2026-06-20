"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  Ellipsis,
  Flame,
  Heart,
  Headphones,
  Inbox,
  MessageCircle,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  UserRound,
  UsersRound,
  UserX,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type Conversation = {
  conversation_id: string;
  ig_account_id: string | null;
  external_user_id: string | null;
  external_username: string | null;
  external_name: string | null;
  external_profile_pic: string | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
  is_verified_user: boolean | null;

  contact_type: string | null;
  excluded_from_ai: boolean | null;
  personal_marked_at: string | null;
  personal_marked_by: string | null;

  is_client: boolean | null;
  client_marked_at: string | null;
  client_marked_by: string | null;

  status: string | null;
  needs_response: boolean | null;
  queue: string | null;
  category: string | null;
  priority: string | null;
  intent: string | null;
  sentiment: string | null;
  objection: string | null;
  product: string | null;

  needs_sofi: boolean | null;
  needs_admin: boolean | null;
  assigned_to: string | null;
  assignment_locked: boolean | null;
  assignment_source: string | null;

  lead_score: number | null;
  urgency_score: number | null;
  sort_score: number | null;

  summary: string | null;
  next_action: string | null;
  ai_reasoning: string | null;
  last_ai_analysis_at: string | null;
  ai_analysis_status: string | null;
  ai_analyzed_message_id: string | null;
  ai_analysis_error: string | null;

  conversation_stage: string | null;
  conversion_status: string | null;
  estimated_value: number | null;
  customer_status: string | null;

  resolution_status: string | null;
  needs_resolution_review: boolean | null;
  open_requests: string[] | null;
  unresolved_items: string[] | null;
  resolution_reason: string | null;
  resolution_alert: string | null;
  resolution_reviewed_at: string | null;
  last_resolution_review_message_id: string | null;

  last_message_id: string | null;
  last_message_type: string | null;
  last_message_text: string | null;
  last_message_direction: string | null;

  last_user_message_at: string | null;
  last_business_reply_at: string | null;
  last_outbound_type: string | null;
  last_automation_reply_at: string | null;
  last_human_reply_at: string | null;

  first_response_at: string | null;
  follow_up_at: string | null;
  resolved_at: string | null;
  sla_due_at: string | null;

  created_at: string | null;
  updated_at: string | null;
};

type DashboardTab =
  | "summary"
  | "urgent"
  | "sofi"
  | "admin"
  | "personal"
  | "resolved";

type QueueTone = "urgent" | "sofi" | "admin" | "personal" | "neutral";
type Assignee = "sofi" | "admin";

type ConversationMessage = {
  message_id: string;
  direction: string | null;
  text: string | null;
  transcription: string | null;
  message_type: string | null;
  outbound_type: string | null;
  sent_at: string | null;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isPersonalConversation(conversation: Conversation) {
  return (
    normalizeText(conversation.contact_type) === "personal" ||
    conversation.excluded_from_ai === true ||
    normalizeText(conversation.category) === "personal" ||
    normalizeText(conversation.queue) === "personal"
  );
}

function isResolvedConversation(conversation: Conversation) {
  if (isPersonalConversation(conversation)) {
    return false;
  }

  return (
    normalizeText(conversation.resolution_status) === "resolved" ||
    normalizeText(conversation.status) === "closed"
  );
}

function isActiveConversation(conversation: Conversation) {
  if (
    isPersonalConversation(conversation) ||
    isResolvedConversation(conversation)
  ) {
    return false;
  }

  const resolutionStatus = normalizeText(conversation.resolution_status);
  const status = normalizeText(conversation.status);

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

function minutesWaiting(conversation: Conversation) {
  if (!isActiveConversation(conversation)) {
    return 0;
  }

  const referenceDate =
    conversation.last_user_message_at || conversation.updated_at;

  if (!referenceDate) {
    return 0;
  }

  const timestamp = new Date(referenceDate).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

function formatWaitingTime(minutes: number) {
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} h`;
  }

  return `${Math.floor(hours / 24)} d`;
}

function getDisplayName(conversation: Conversation) {
  if (conversation.external_username) {
    return `@${conversation.external_username}`;
  }

  if (conversation.external_name) {
    return conversation.external_name;
  }

  return conversation.external_user_id || "Usuario desconocido";
}

function getQueue(conversation: Conversation) {
  if (isPersonalConversation(conversation)) {
    return "personal";
  }

  const explicitQueue = normalizeText(conversation.queue);

  if (explicitQueue === "urgent") return "urgent";
  if (explicitQueue === "sofi") return "sofi";
  if (explicitQueue === "admin") return "admin";

  const waitingMinutes = minutesWaiting(conversation);
  const category = normalizeText(conversation.category);
  const priority = normalizeText(conversation.priority);

  if (
    isActiveConversation(conversation) &&
    (priority === "high" ||
      (conversation.urgency_score || 0) >= 70 ||
      waitingMinutes >= 180)
  ) {
    return "urgent";
  }

  if (
    conversation.needs_sofi ||
    normalizeText(conversation.assigned_to) === "sofi" ||
    ["high_ticket", "testimonio", "colaboracion"].includes(category)
  ) {
    return "sofi";
  }

  if (
    conversation.needs_admin ||
    normalizeText(conversation.assigned_to) === "admin" ||
    ["soporte", "admin", "clienta_actual"].includes(category)
  ) {
    return "admin";
  }

  return "unassigned";
}

function getOperationalScore(conversation: Conversation) {
  if (typeof conversation.sort_score === "number") {
    return conversation.sort_score;
  }

  let score = 0;
  const queue = getQueue(conversation);
  const waitingMinutes = minutesWaiting(conversation);
  const priority = normalizeText(conversation.priority);
  const category = normalizeText(conversation.category);
  const intent = normalizeText(conversation.intent);
  const resolutionStatus = normalizeText(conversation.resolution_status);

  if (queue === "urgent") score += 200;
  if (queue === "sofi") score += 100;
  if (queue === "admin") score += 70;
  if (priority === "high") score += 100;
  if (priority === "medium") score += 40;
  if (category === "high_ticket") score += 80;
  if (conversation.needs_sofi) score += 60;
  if (conversation.needs_admin) score += 40;
  if (conversation.status === "bot_answered") score += 50;
  if (conversation.needs_response) score += 40;

  if (
    ["wants_price", "wants_call", "wants_link", "ready_to_buy"].includes(
      intent
    )
  ) {
    score += 50;
  }

  if (resolutionStatus === "answered_pending_resolution") score += 60;
  if (resolutionStatus === "needs_follow_up") score += 80;
  if (conversation.needs_resolution_review) score += 50;
  if (waitingMinutes >= 180) score += 30;
  if (waitingMinutes >= 1440) score += 70;

  score += conversation.lead_score || 0;
  score += conversation.urgency_score || 0;

  if (isResolvedConversation(conversation)) score -= 500;

  return score;
}

function getStatusLabel(conversation: Conversation) {
  if (isPersonalConversation(conversation)) {
    return "Personal";
  }

  const resolutionStatus = normalizeText(conversation.resolution_status);

  if (resolutionStatus === "resolved") return "Resuelta";
  if (resolutionStatus === "answered_pending_resolution") {
    return "Respondida · No resuelta";
  }
  if (resolutionStatus === "needs_follow_up") return "Seguimiento pendiente";
  if (conversation.status === "bot_answered") return "Bot respondió";
  if (conversation.needs_response) return "Pendiente";
  if (conversation.status === "answered") return "Respuesta en revisión";
  if (conversation.status === "closed") return "Cerrada";

  return conversation.status || "Sin estado";
}

function getStatusClass(conversation: Conversation) {
  if (isPersonalConversation(conversation)) return "personal";

  const resolutionStatus = normalizeText(conversation.resolution_status);

  if (resolutionStatus === "resolved") return "resolved";
  if (resolutionStatus === "answered_pending_resolution") return "incomplete";
  if (resolutionStatus === "needs_follow_up") return "follow_up";

  return normalizeText(conversation.status) || "unknown";
}

function humanize(value: string | null) {
  if (!value) return "Sin clasificar";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getQueueMeta(tone: QueueTone) {
  if (tone === "urgent") {
    return { label: "Hot lead", icon: <Flame size={14} /> };
  }

  if (tone === "sofi") {
    return { label: "Sofi", icon: <UserRound size={14} /> };
  }

  if (tone === "admin") {
    return { label: "Admin", icon: <Headphones size={14} /> };
  }

  if (tone === "personal") {
    return { label: "Personal", icon: <Heart size={14} /> };
  }

  return { label: "Sin asignar", icon: <MessageCircle size={14} /> };
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}


function ExpandableText({
  text,
  limit,
}: {
  text: string;
  limit: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cleanText = text.trim();
  const canExpand = cleanText.length > limit;

  const visibleText =
    canExpand && !expanded
      ? `${cleanText.slice(0, limit).trimEnd()}…`
      : cleanText;

  return (
    <div className="expandable-text">
      <p>{visibleText}</p>

      {canExpand && (
        <button
          type="button"
          className="expand-button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      )}
    </div>
  );
}


function formatMessageTime(dateString: string | null) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getMessageContent(message: ConversationMessage) {
  const text = message.text?.trim();
  const transcription = message.transcription?.trim();

  if (text) return text;
  if (transcription) return transcription;

  if (message.message_type === "audio") {
    return "Nota de voz sin transcripción disponible.";
  }

  return "Mensaje sin contenido visible.";
}

function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [messageError, setMessageError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages() {
    try {
      setLoadingMessages(true);
      setMessageError("");

      const response = await fetch(
        `/api/dashboard/conversations/${encodeURIComponent(
          conversationId
        )}/messages`,
        {
          cache: "no-store",
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.details ||
            body.error ||
            "No se pudo cargar la conversación."
        );
      }

      setMessages(body.messages || []);
      setMessagesLoaded(true);
    } catch (error) {
      setMessageError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la conversación."
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!messagesLoaded || !scrollRef.current) {
      return;
    }

    const container = scrollRef.current;
    container.scrollTop = container.scrollHeight;
  }, [messages, messagesLoaded]);

  if (!messagesLoaded) {
    return (
      <div className="conversation-thread conversation-thread-empty">
        <div className="thread-heading">
          <div>
            <MessageCircle size={14} />
            <span>Conversación</span>
          </div>

          <small>Últimos 30 mensajes</small>
        </div>

        {messageError && (
          <p className="thread-error">{messageError}</p>
        )}

        <button
          type="button"
          className="load-thread-button"
          disabled={loadingMessages}
          onClick={loadMessages}
        >
          <MessageCircle size={15} />
          {loadingMessages ? "Cargando..." : "Ver conversación"}
        </button>
      </div>
    );
  }

  return (
    <div className="conversation-thread">
      <div className="thread-heading">
        <div>
          <MessageCircle size={14} />
          <span>Conversación</span>
        </div>

        <button
          type="button"
          className="refresh-thread-button"
          disabled={loadingMessages}
          onClick={loadMessages}
        >
          {loadingMessages ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="thread-scroll" ref={scrollRef}>
        {messages.length > 0 ? (
          messages.map((message) => {
            const isInbound = message.direction === "inbound";
            const isAutomation =
              !isInbound && message.outbound_type === "automation";

            return (
              <div
                key={message.message_id}
                className={`thread-message-row ${
                  isInbound ? "thread-inbound" : "thread-outbound"
                }`}
              >
                <div
                  className={`thread-bubble ${
                    isInbound
                      ? "bubble-inbound"
                      : isAutomation
                        ? "bubble-automation"
                        : "bubble-outbound"
                  }`}
                >
                  {message.message_type === "audio" && (
                    <span className="audio-message-label">
                      <Mic size={12} />
                      Nota de voz transcrita
                    </span>
                  )}

                  <p>{getMessageContent(message)}</p>

                  <small>
                    {isInbound
                      ? "Ella"
                      : isAutomation
                        ? "Bot"
                        : "Sofi / equipo"}
                    {formatMessageTime(message.sent_at)
                      ? ` · ${formatMessageTime(message.sent_at)}`
                      : ""}
                  </small>
                </div>
              </div>
            );
          })
        ) : (
          <div className="thread-no-messages">
            No hay mensajes disponibles.
          </div>
        )}
      </div>
    </div>
  );
}

function RelationshipSignals({
  conversation,
}: {
  conversation: Conversation;
}) {
  return (
    <div className="relationship-signals">
      <span
        className={
          conversation.is_user_follow_business
            ? "relationship-positive"
            : "relationship-negative"
        }
      >
        {conversation.is_user_follow_business ? (
          <UserCheck size={13} />
        ) : (
          <UserX size={13} />
        )}
        {conversation.is_user_follow_business ? "Te sigue" : "No te sigue"}
      </span>

      <span
        className={
          conversation.is_business_follow_user
            ? "relationship-positive"
            : "relationship-neutral"
        }
      >
        {conversation.is_business_follow_user ? (
          <Eye size={13} />
        ) : (
          <EyeOff size={13} />
        )}
        {conversation.is_business_follow_user ? "La sigues" : "No la sigues"}
      </span>
    </div>
  );
}

function ConversationCard({
  conversation,
  tone,
  assigningConversationId,
  personalConversationId,
  clientConversationId,
  onAssign,
  onTogglePersonal,
  onToggleClient,
}: {
  conversation: Conversation;
  tone: QueueTone;
  assigningConversationId: string | null;
  personalConversationId: string | null;
  clientConversationId: string | null;
  onAssign: (conversationId: string, assignedTo: Assignee) => Promise<void>;
  onTogglePersonal: (
    conversationId: string,
    isPersonal: boolean
  ) => Promise<void>;
  onToggleClient: (
    conversationId: string,
    isClient: boolean
  ) => Promise<void>;
}) {
  const waiting = minutesWaiting(conversation);
  const isPersonal = isPersonalConversation(conversation);
  const isAssigning = assigningConversationId === conversation.conversation_id;
  const isUpdatingPersonal =
    personalConversationId === conversation.conversation_id;
  const isUpdatingClient =
    clientConversationId === conversation.conversation_id;
  const isClient = conversation.is_client === true;

  const instagramUrl = conversation.external_username
    ? `https://www.instagram.com/${conversation.external_username}/`
    : null;

  const unresolvedItems = Array.isArray(conversation.unresolved_items)
    ? conversation.unresolved_items
    : [];

  return (
    <article
      className={`conversation-card conversation-${tone} ${
        isClient ? "client-card" : ""
      }`}
    >
      <div className="card-header">
        <div className="profile-area">
          <div className="instagram-avatar-ring">
            {conversation.external_profile_pic ? (
              <img
                src={conversation.external_profile_pic}
                alt={getDisplayName(conversation)}
                className="instagram-avatar"
              />
            ) : (
              <div className="instagram-avatar avatar-fallback">
                {getDisplayName(conversation).slice(0, 1)}
              </div>
            )}
          </div>

          <div className="profile-copy">
            <div className="username-row">
              <strong>{getDisplayName(conversation)}</strong>

              {isClient && (
                <Star
                  size={15}
                  className="client-star"
                  fill="currentColor"
                />
              )}

              {conversation.is_verified_user && (
                <ShieldCheck size={15} className="verified-icon" />
              )}
            </div>

            <span className="real-name">
              {conversation.external_name || "Sin nombre"}
            </span>

            <RelationshipSignals conversation={conversation} />
          </div>
        </div>

        <div className="top-tags">
          {!isPersonal && (
            <>
              <span className="compact-tag score-tag">
                Lead {conversation.lead_score || 0}
              </span>

              <span
                className={`compact-tag urgency-tag ${
                  (conversation.urgency_score || 0) >= 70
                    ? "urgency-high"
                    : ""
                }`}
              >
                Urgencia {conversation.urgency_score || 0}
              </span>

              <span className="compact-tag classification-tag">
                {humanize(conversation.intent)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="status-row">
        <span className={`status-pill status-${getStatusClass(conversation)}`}>
          {getStatusLabel(conversation)}
        </span>

        {isClient && (
          <span className="client-pill">
            <Star size={12} fill="currentColor" />
            Clienta
          </span>
        )}

        {conversation.last_outbound_type === "automation" && !isPersonal && (
          <span className="automation-pill">
            <Bot size={12} />
            Bot
          </span>
        )}

        {conversation.assignment_source === "manual" && !isPersonal && (
          <span className="manual-pill">Asignación manual</span>
        )}
      </div>

      {conversation.resolution_alert && !isPersonal && (
        <div className="resolution-alert">
          <AlertTriangle size={16} />

          <div>
            <strong>Respuesta incompleta</strong>
            <p>{conversation.resolution_alert}</p>
          </div>
        </div>
      )}

      {unresolvedItems.length > 0 && !isPersonal && (
        <div className="unresolved-inline">
          <strong>Falta:</strong> {unresolvedItems.join(" · ")}
        </div>
      )}

      <ConversationThread
        conversationId={conversation.conversation_id}
      />

      {!isPersonal && (
        <div className="compact-summary">
          <div>
            <span>Resumen</span>
            <ExpandableText
              text={
                conversation.summary ||
                "Pendiente de análisis con inteligencia artificial."
              }
              limit={150}
            />
          </div>

          <div>
            <span>Siguiente acción</span>
            <ExpandableText
              text={
                conversation.next_action ||
                "Revisar la conversación y definir el siguiente paso."
              }
              limit={150}
            />
          </div>
        </div>
      )}

      <div className="card-actions">
        {!isPersonal && (
          <>
            <button
              type="button"
              className={`action-button ${
                conversation.assigned_to === "sofi" ? "action-active" : ""
              }`}
              disabled={isAssigning || isUpdatingPersonal || isUpdatingClient}
              onClick={() => onAssign(conversation.conversation_id, "sofi")}
            >
              <UserRound size={14} />
              Sofi
            </button>

            <button
              type="button"
              className={`action-button ${
                conversation.assigned_to === "admin" ? "action-active" : ""
              }`}
              disabled={isAssigning || isUpdatingPersonal || isUpdatingClient}
              onClick={() => onAssign(conversation.conversation_id, "admin")}
            >
              <Headphones size={14} />
              Admin
            </button>
          </>
        )}

        <div className="secondary-actions">
          <button
            type="button"
            className={`action-button client-button ${
              isClient ? "client-active" : ""
            }`}
            disabled={isAssigning || isUpdatingPersonal || isUpdatingClient}
            onClick={() =>
              onToggleClient(conversation.conversation_id, !isClient)
            }
          >
            <Star size={14} fill={isClient ? "currentColor" : "none"} />
            {isUpdatingClient
              ? "Guardando..."
              : isClient
                ? "Quitar clienta"
                : "Clienta"}
          </button>

          <button
            type="button"
            className={`action-button personal-button ${
              isPersonal ? "personal-active" : ""
            }`}
            disabled={isAssigning || isUpdatingPersonal || isUpdatingClient}
            onClick={() =>
              onTogglePersonal(conversation.conversation_id, !isPersonal)
            }
          >
            <Heart size={14} />
            {isUpdatingPersonal
              ? "Guardando..."
              : isPersonal
                ? "Sacar"
                : "Personal"}
          </button>
        </div>

        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="action-button instagram-action"
          >
            Abrir DM
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <span className="action-button action-disabled instagram-action">
            Sin perfil
          </span>
        )}
      </div>

      <div className="card-footer">
        <div
          className={`waiting-indicator ${
            waiting >= 180 ? "waiting-danger" : ""
          }`}
        >
          <Clock3 size={14} />

          <strong>
            {isPersonal
              ? "Fuera del flujo de IA"
              : formatWaitingTime(waiting)}
          </strong>

          {!isPersonal && (
            <span>
              {conversation.needs_resolution_review
                ? "sin resolución completa"
                : "esperando atención"}
            </span>
          )}
        </div>

        <span>{formatDate(conversation.updated_at)}</span>
      </div>
    </article>
  );
}



function SummaryConversationCard({
  conversation,
  assigningConversationId,
  personalConversationId,
  clientConversationId,
  onAssign,
  onTogglePersonal,
  onToggleClient,
}: {
  conversation: Conversation;
  assigningConversationId: string | null;
  personalConversationId: string | null;
  clientConversationId: string | null;
  onAssign: (conversationId: string, assignedTo: Assignee) => Promise<void>;
  onTogglePersonal: (
    conversationId: string,
    isPersonal: boolean
  ) => Promise<void>;
  onToggleClient: (
    conversationId: string,
    isClient: boolean
  ) => Promise<void>;
}) {
  const personal = isPersonalConversation(conversation);
  const isClient = conversation.is_client === true;

  const isBusy =
    assigningConversationId === conversation.conversation_id ||
    personalConversationId === conversation.conversation_id ||
    clientConversationId === conversation.conversation_id;

  const instagramUrl = conversation.external_username
    ? `https://www.instagram.com/${conversation.external_username}/`
    : null;

  return (
    <article
      className={`summary-card ${
        isClient ? "summary-card-client" : ""
      }`}
    >
      <div className="summary-card-top">
        <div className="summary-profile">
          <div className="summary-avatar-ring">
            {conversation.external_profile_pic ? (
              <img
                src={conversation.external_profile_pic}
                alt={getDisplayName(conversation)}
                className="summary-avatar"
              />
            ) : (
              <div className="summary-avatar summary-avatar-fallback">
                {getDisplayName(conversation).slice(0, 1)}
              </div>
            )}
          </div>

          <div className="summary-profile-copy">
            <div className="summary-name-row">
              <strong>{getDisplayName(conversation)}</strong>

              {conversation.is_verified_user && (
                <ShieldCheck size={13} className="verified-icon" />
              )}

              {isClient && (
                <Star
                  size={14}
                  className="client-star"
                  fill="currentColor"
                />
              )}
            </div>

            <span>{conversation.external_name || "Sin nombre"}</span>
          </div>
        </div>

        <div className="summary-header-tags">
          {!personal && (
            <>
              <span>Lead {conversation.lead_score || 0}</span>

              <span
                className={
                  (conversation.urgency_score || 0) >= 70
                    ? "summary-urgency-high"
                    : ""
                }
              >
                U {conversation.urgency_score || 0}
              </span>
            </>
          )}
        </div>

        <details className="summary-actions-menu">
          <summary aria-label="Abrir acciones">
            <Ellipsis size={19} />
          </summary>

          <div className="summary-actions-dropdown">
            {!personal && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    onAssign(conversation.conversation_id, "sofi")
                  }
                >
                  <UserRound size={15} />
                  Asignar a Sofi
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    onAssign(conversation.conversation_id, "admin")
                  }
                >
                  <Headphones size={15} />
                  Asignar a Admin
                </button>
              </>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                onToggleClient(
                  conversation.conversation_id,
                  !isClient
                )
              }
            >
              <Star size={15} />
              {isClient ? "Quitar Clienta" : "Marcar Clienta"}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                onTogglePersonal(
                  conversation.conversation_id,
                  !personal
                )
              }
            >
              <Heart size={15} />
              {personal ? "Sacar de Personal" : "Mover a Personal"}
            </button>

            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowUpRight size={15} />
                Abrir DM
              </a>
            ) : (
              <span className="summary-disabled-action">
                <ArrowUpRight size={15} />
                Sin perfil
              </span>
            )}
          </div>
        </details>
      </div>

      <div className="summary-text">
        <p>
          {conversation.summary ||
            conversation.last_message_text ||
            "Pendiente de análisis."}
        </p>
      </div>

      {conversation.resolution_alert && !personal && (
        <div className="summary-alert">
          <AlertTriangle size={13} />
          <span>{conversation.resolution_alert}</span>
        </div>
      )}

      <div className="summary-card-bottom">
        <span>{humanize(conversation.intent)}</span>
        <time>{formatDate(conversation.updated_at)}</time>
      </div>
    </article>
  );
}

function QueueSection({
  title,
  description,
  conversations,
  icon,
  tone,
  assigningConversationId,
  personalConversationId,
  clientConversationId,
  onAssign,
  onTogglePersonal,
  onToggleClient,
}: {
  title: string;
  description: string;
  conversations: Conversation[];
  icon: ReactNode;
  tone: QueueTone;
  assigningConversationId: string | null;
  personalConversationId: string | null;
  clientConversationId: string | null;
  onAssign: (conversationId: string, assignedTo: Assignee) => Promise<void>;
  onTogglePersonal: (
    conversationId: string,
    isPersonal: boolean
  ) => Promise<void>;
  onToggleClient: (
    conversationId: string,
    isClient: boolean
  ) => Promise<void>;
}) {
  return (
    <section className={`queue-section queue-section-${tone}`}>
      <div className="queue-section-header">
        <div className={`queue-section-icon queue-section-icon-${tone}`}>
          {icon}
        </div>

        <div>
          <div className="queue-heading-row">
            <h2>{title}</h2>
            <span>{conversations.length}</span>
          </div>

          <p>{description}</p>
        </div>
      </div>

      {conversations.length > 0 ? (
        <div className="conversation-grid">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.conversation_id}
              conversation={conversation}
              tone={tone}
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              clientConversationId={clientConversationId}
              onAssign={onAssign}
              onTogglePersonal={onTogglePersonal}
              onToggleClient={onToggleClient}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <CheckCircle2 size={28} />
          <strong>No hay conversaciones en esta sección.</strong>
          <span>Todo está bajo control.</span>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [assigningConversationId, setAssigningConversationId] = useState<
    string | null
  >(null);
  const [personalConversationId, setPersonalConversationId] = useState<
    string | null
  >(null);
  const [clientConversationId, setClientConversationId] = useState<
    string | null
  >(null);

  const [activeTab, setActiveTab] =
    useState<DashboardTab>("summary");
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  async function loadConversations(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      setLoadError("");

      const response = await fetch("/api/dashboard/conversations", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar las conversaciones.");
      }

      const json = await response.json();
      setConversations(json.conversations || []);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error cargando el dashboard."
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations(true);

    const intervalId = window.setInterval(() => {
      loadConversations(false);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function assignConversation(
    conversationId: string,
    assignedTo: Assignee
  ) {
    try {
      setActionError("");
      setAssigningConversationId(conversationId);

      const response = await fetch(
        "/api/dashboard/conversations/assign",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            assigned_to: assignedTo,
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.details || body.error || "No se pudo guardar la asignación."
        );
      }

      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.conversation_id !== conversationId) {
            return conversation;
          }

          const isSofi = assignedTo === "sofi";

          return {
            ...conversation,
            assigned_to: assignedTo,
            queue: assignedTo,
            needs_sofi: isSofi,
            needs_admin: !isSofi,
            assignment_locked: true,
            assignment_source: "manual",
            updated_at: body.conversation.updated_at,
          };
        })
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la asignación."
      );
    } finally {
      setAssigningConversationId(null);
    }
  }

  async function togglePersonalConversation(
    conversationId: string,
    isPersonal: boolean
  ) {
    try {
      setActionError("");
      setPersonalConversationId(conversationId);

      const response = await fetch(
        "/api/dashboard/conversations/personal",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            is_personal: isPersonal,
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.details ||
            body.error ||
            "No se pudo actualizar Personal."
        );
      }

      await loadConversations(false);

      if (isPersonal) {
        setActiveTab("personal");
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar Personal."
      );
    } finally {
      setPersonalConversationId(null);
    }
  }


  async function toggleClientConversation(
    conversationId: string,
    isClient: boolean
  ) {
    try {
      setActionError("");
      setClientConversationId(conversationId);

      const response = await fetch(
        "/api/dashboard/conversations/client",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            is_client: isClient,
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.details ||
            body.error ||
            "No se pudo actualizar el estado de Clienta."
        );
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.conversation_id === conversationId
            ? {
                ...conversation,
                is_client: body.conversation.is_client,
                client_marked_at: body.conversation.client_marked_at,
                client_marked_by: body.conversation.client_marked_by,
                updated_at: body.conversation.updated_at,
              }
            : conversation
        )
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado de Clienta."
      );
    } finally {
      setClientConversationId(null);
    }
  }

  const searchableConversations = useMemo(() => {
    const query = normalizeText(search);

    return conversations
      .filter((conversation) => {
        if (!query) return true;

        const searchable = [
          conversation.external_username,
          conversation.external_name,
          conversation.last_message_text,
          conversation.summary,
          conversation.next_action,
          conversation.category,
          conversation.product,
          conversation.intent,
          conversation.resolution_alert,
          ...(conversation.unresolved_items || []),
          ...(conversation.open_requests || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => getOperationalScore(b) - getOperationalScore(a));
  }, [conversations, search]);

  const activeConversations = searchableConversations.filter(
    isActiveConversation
  );

  const personal = searchableConversations
    .filter(isPersonalConversation)
    .sort(
      (a, b) =>
        new Date(b.personal_marked_at || b.updated_at || 0).getTime() -
        new Date(a.personal_marked_at || a.updated_at || 0).getTime()
    );

  const urgent = activeConversations.filter(
    (conversation) => getQueue(conversation) === "urgent"
  );

  const sofi = activeConversations.filter(
    (conversation) => getQueue(conversation) === "sofi"
  );

  const admin = activeConversations.filter(
    (conversation) => getQueue(conversation) === "admin"
  );

  const unassigned = activeConversations.filter(
    (conversation) => getQueue(conversation) === "unassigned"
  );

  const resolved = searchableConversations
    .filter(isResolvedConversation)
    .sort(
      (a, b) =>
        new Date(b.updated_at || 0).getTime() -
        new Date(a.updated_at || 0).getTime()
    );

  const incompleteResponses = conversations.filter(
    (conversation) =>
      !isPersonalConversation(conversation) &&
      [
        "answered_pending_resolution",
        "needs_follow_up",
      ].includes(normalizeText(conversation.resolution_status))
  ).length;

  const highTicket = conversations.filter(
    (conversation) =>
      isActiveConversation(conversation) &&
      normalizeText(conversation.category) === "high_ticket"
  ).length;

  const waitingConversations = conversations.filter(
    isActiveConversation
  );

  const averageWaitMinutes =
    waitingConversations.length > 0
      ? Math.round(
          waitingConversations.reduce(
            (sum, conversation) =>
              sum + minutesWaiting(conversation),
            0
          ) / waitingConversations.length
        )
      : 0;

  const shouldShowActiveOnly =
    activeTab !== "summary" &&
    activeTab !== "personal" &&
    activeTab !== "resolved" &&
    onlyActive;

  const visibleUrgent = shouldShowActiveOnly
    ? urgent
    : searchableConversations.filter(
        (conversation) =>
          !isPersonalConversation(conversation) &&
          getQueue(conversation) === "urgent"
      );

  const visibleSofi = shouldShowActiveOnly
    ? sofi
    : searchableConversations.filter(
        (conversation) =>
          !isPersonalConversation(conversation) &&
          getQueue(conversation) === "sofi"
      );

  const visibleAdmin = shouldShowActiveOnly
    ? admin
    : searchableConversations.filter(
        (conversation) =>
          !isPersonalConversation(conversation) &&
          getQueue(conversation) === "admin"
      );

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <div className="brand-label">
            <Sparkles size={15} />
            Sofi Intelligence Inbox
          </div>

          <h1>Centro de conversaciones · Horizontal</h1>

          <p>
            Prueba una vista horizontal de una sola conversación por fila, usando los mismos datos y acciones.
          </p>
        </div>

        <div className="header-actions">
          <div className="live-indicator">
            <span />
            Actualización automática
          </div>

          <a href="/api/dashboard/logout" className="logout-button">
            Cerrar sesión
          </a>
        </div>
      </header>

      <section className="metrics-grid">
        <MetricCard
          label="Hot leads"
          value={urgent.length}
          description="Alta intención y prioridad"
          icon={<Flame size={19} />}
          tone="danger"
        />

        <MetricCard
          label="Pendientes de Sofi"
          value={sofi.length}
          description="Venta, confianza y relación"
          icon={<UserRound size={19} />}
          tone="sofi"
        />

        <MetricCard
          label="Pendientes de Admin"
          value={admin.length}
          description="Pagos, acceso y operación"
          icon={<Headphones size={19} />}
          tone="admin"
        />

        <MetricCard
          label="Respuestas incompletas"
          value={incompleteResponses}
          description="Se contestó, pero falta algo"
          icon={<AlertTriangle size={19} />}
          tone="warning"
        />

        <MetricCard
          label="High-ticket activos"
          value={highTicket}
          description="Oportunidades comerciales"
          icon={<CircleDollarSign size={19} />}
          tone="sales"
        />

        <MetricCard
          label="Personal"
          value={personal.length}
          description="Fuera de IA y seguimiento"
          icon={<Heart size={19} />}
          tone="personal"
        />

        <MetricCard
          label="Espera promedio"
          value={formatWaitingTime(averageWaitMinutes)}
          description="Conversaciones activas"
          icon={<Clock3 size={19} />}
          tone="time"
        />
      </section>

      <section className="control-bar">
        <div className="tabs">
          <button
            className={activeTab === "summary" ? "active" : ""}
            onClick={() => setActiveTab("summary")}
          >
            <Inbox size={15} />
            Resumen
          </button>

          <button
            className={activeTab === "urgent" ? "active urgent-tab" : ""}
            onClick={() => setActiveTab("urgent")}
          >
            <Flame size={15} />
            Hot leads
          </button>

          <button
            className={activeTab === "sofi" ? "active" : ""}
            onClick={() => setActiveTab("sofi")}
          >
            <UserRound size={15} />
            Sofi
          </button>

          <button
            className={activeTab === "admin" ? "active" : ""}
            onClick={() => setActiveTab("admin")}
          >
            <UsersRound size={15} />
            Admin
          </button>

          <button
            className={activeTab === "personal" ? "active personal-tab" : ""}
            onClick={() => setActiveTab("personal")}
          >
            <Heart size={15} />
            Personal
          </button>

          <button
            className={activeTab === "resolved" ? "active" : ""}
            onClick={() => setActiveTab("resolved")}
          >
            <CheckCircle2 size={15} />
            Resueltas
          </button>
        </div>

        <div className="filters">
          <label className="search-box">
            <Search size={16} />

            <input
              type="search"
              placeholder="Buscar nombre, mensaje, producto..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          {activeTab !== "summary" &&
            activeTab !== "personal" &&
            activeTab !== "resolved" && (
            <label className="pending-toggle">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(event) => setOnlyActive(event.target.checked)}
              />
              Solo activas
            </label>
          )}
        </div>
      </section>

      {actionError && (
        <section className="action-error">
          <XCircle size={18} />
          <span>{actionError}</span>
        </section>
      )}

      {loading && (
        <section className="page-state">
          <MessageCircle size={28} />
          <strong>Cargando conversaciones...</strong>
        </section>
      )}

      {loadError && (
        <section className="page-state error-state">
          <XCircle size={28} />
          <strong>{loadError}</strong>
        </section>
      )}

      {!loading && !loadError && (
        <div className="queues-container">
          {activeTab === "summary" && (
            <section className="summary-view">
              <div className="summary-view-heading">
                <div>
                  <h2>Resumen del inbox</h2>
                  <p>
                    Cuatro colas operativas para visualizar el inbox de un vistazo.
                  </p>
                </div>

                <span>{activeConversations.length} activas</span>
              </div>

              <div className="summary-board">
                <section className="summary-column summary-column-hot">
                  <div className="summary-column-heading">
                    <div>
                      <Flame size={16} />
                      <strong>Hot leads</strong>
                    </div>
                    <span>{urgent.length}</span>
                  </div>

                  <div className="summary-column-list">
                    {urgent.map((conversation) => (
                      <SummaryConversationCard
                        key={conversation.conversation_id}
                        conversation={conversation}
                        assigningConversationId={assigningConversationId}
                        personalConversationId={personalConversationId}
                        clientConversationId={clientConversationId}
                        onAssign={assignConversation}
                        onTogglePersonal={togglePersonalConversation}
                        onToggleClient={toggleClientConversation}
                      />
                    ))}
                  </div>

                  {urgent.length === 0 && (
                    <div className="summary-column-empty">
                      Sin hot leads
                    </div>
                  )}
                </section>

                <section className="summary-column summary-column-sofi">
                  <div className="summary-column-heading">
                    <div>
                      <UserRound size={16} />
                      <strong>Sofi</strong>
                    </div>
                    <span>{sofi.length}</span>
                  </div>

                  <div className="summary-column-list">
                    {sofi.map((conversation) => (
                      <SummaryConversationCard
                        key={conversation.conversation_id}
                        conversation={conversation}
                        assigningConversationId={assigningConversationId}
                        personalConversationId={personalConversationId}
                        clientConversationId={clientConversationId}
                        onAssign={assignConversation}
                        onTogglePersonal={togglePersonalConversation}
                        onToggleClient={toggleClientConversation}
                      />
                    ))}
                  </div>

                  {sofi.length === 0 && (
                    <div className="summary-column-empty">
                      Sin pendientes de Sofi
                    </div>
                  )}
                </section>

                <section className="summary-column summary-column-admin">
                  <div className="summary-column-heading">
                    <div>
                      <Headphones size={16} />
                      <strong>Admin</strong>
                    </div>
                    <span>{admin.length}</span>
                  </div>

                  <div className="summary-column-list">
                    {admin.map((conversation) => (
                      <SummaryConversationCard
                        key={conversation.conversation_id}
                        conversation={conversation}
                        assigningConversationId={assigningConversationId}
                        personalConversationId={personalConversationId}
                        clientConversationId={clientConversationId}
                        onAssign={assignConversation}
                        onTogglePersonal={togglePersonalConversation}
                        onToggleClient={toggleClientConversation}
                      />
                    ))}
                  </div>

                  {admin.length === 0 && (
                    <div className="summary-column-empty">
                      Sin pendientes de Admin
                    </div>
                  )}
                </section>

                <section className="summary-column summary-column-unassigned">
                  <div className="summary-column-heading">
                    <div>
                      <MessageCircle size={16} />
                      <strong>Sin asignar</strong>
                    </div>
                    <span>{unassigned.length}</span>
                  </div>

                  <div className="summary-column-list">
                    {unassigned.map((conversation) => (
                      <SummaryConversationCard
                        key={conversation.conversation_id}
                        conversation={conversation}
                        assigningConversationId={assigningConversationId}
                        personalConversationId={personalConversationId}
                        clientConversationId={clientConversationId}
                        onAssign={assignConversation}
                        onTogglePersonal={togglePersonalConversation}
                        onToggleClient={toggleClientConversation}
                      />
                    ))}
                  </div>

                  {unassigned.length === 0 && (
                    <div className="summary-column-empty">
                      Todo está clasificado
                    </div>
                  )}
                </section>
              </div>
            </section>
          )}

          {activeTab === "urgent" && (
            <QueueSection
              title="Hot leads"
              description="Leads con alta intención, urgencia o potencial de cierre."
              conversations={visibleUrgent}
              icon={<Flame size={20} />}
              tone="urgent"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              clientConversationId={clientConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
              onToggleClient={toggleClientConversation}
            />
          )}

          {activeTab === "sofi" && (
            <QueueSection
              title="Sofi"
              description="Conversaciones donde la voz personal de Sofi puede mover la decisión."
              conversations={visibleSofi}
              icon={<UserRound size={20} />}
              tone="sofi"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              clientConversationId={clientConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
              onToggleClient={toggleClientConversation}
            />
          )}

          {activeTab === "admin" && (
            <QueueSection
              title="Admin"
              description="Pagos, accesos, soporte, logística y seguimiento operativo."
              conversations={visibleAdmin}
              icon={<Headphones size={20} />}
              tone="admin"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              clientConversationId={clientConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
              onToggleClient={toggleClientConversation}
            />
          )}

          {false && unassigned.length > 0 && (
            <QueueSection
              title="Sin asignar"
              description="Conversaciones activas pendientes de clasificación."
              conversations={unassigned}
              icon={<MessageCircle size={20} />}
              tone="neutral"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              clientConversationId={clientConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
              onToggleClient={toggleClientConversation}
            />
          )}

          {activeTab === "personal" && (
            <QueueSection
              title="Personal"
              description="Amigos y contactos personales excluidos del análisis de IA."
              conversations={personal}
              icon={<Heart size={20} />}
              tone="personal"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              clientConversationId={clientConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
              onToggleClient={toggleClientConversation}
            />
          )}

          {activeTab === "resolved" && (
            <QueueSection
              title="Resueltas"
              description="Solicitudes confirmadas como resueltas o conversaciones cerradas."
              conversations={resolved}
              icon={<CheckCircle2 size={20} />}
              tone="neutral"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              clientConversationId={clientConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
              onToggleClient={toggleClientConversation}
            />
          )}
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .dashboard-page {
          min-height: 100vh;
          padding: 30px;
          color: #18181b;
          background:
            radial-gradient(circle at top right, #f3ecff 0, transparent 28%),
            #f7f7f8;
          font-family:
            Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 22px;
          margin-bottom: 22px;
        }

        .brand-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
          color: #7250a6;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(29px, 4vw, 40px);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .dashboard-header p {
          margin: 8px 0 0;
          color: #71717a;
          font-size: 14px;
        }

        .header-actions,
        .tabs,
        .filters {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 11px;
          border: 1px solid #e4e4e7;
          border-radius: 999px;
          background: white;
          color: #52525b;
          font-size: 12px;
          font-weight: 700;
        }

        .live-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px #dcfce7;
        }

        .logout-button {
          padding: 9px 12px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          color: #27272a;
          background: white;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .metric-card {
          display: flex;
          gap: 10px;
          min-height: 98px;
          padding: 14px;
          border: 1px solid #e4e4e7;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 6px 24px rgba(24, 24, 27, 0.04);
        }

        .metric-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #f4f4f5;
        }

        .metric-card span {
          display: block;
          color: #71717a;
          font-size: 10px;
          font-weight: 750;
        }

        .metric-card strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          line-height: 1;
        }

        .metric-card small {
          display: block;
          margin-top: 7px;
          color: #a1a1aa;
          font-size: 9px;
          line-height: 1.3;
        }

        .metric-danger .metric-icon {
          color: #b42318;
          background: #fee4e2;
        }

        .metric-sofi .metric-icon {
          color: #6941c6;
          background: #eee7ff;
        }

        .metric-admin .metric-icon {
          color: #175cd3;
          background: #eaf2ff;
        }

        .metric-warning .metric-icon,
        .metric-time .metric-icon {
          color: #b54708;
          background: #fef0c7;
        }

        .metric-sales .metric-icon {
          color: #067647;
          background: #dcfae6;
        }

        .metric-personal .metric-icon {
          color: #c11574;
          background: #fce7f6;
        }

        .control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          padding: 9px;
          border: 1px solid #e4e4e7;
          border-radius: 14px;
          background: white;
          box-shadow: 0 5px 20px rgba(24, 24, 27, 0.035);
        }

        .tabs button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border: 0;
          border-radius: 9px;
          color: #71717a;
          background: transparent;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .tabs button:hover {
          background: #f4f4f5;
        }

        .tabs button.active {
          color: #18181b;
          background: #f1f1f3;
        }

        .tabs button.urgent-tab.active {
          color: #b42318;
          background: #fff0ee;
        }

        .tabs button.personal-tab.active {
          color: #c11574;
          background: #fdf2fa;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 290px;
          padding: 8px 10px;
          border: 1px solid #e4e4e7;
          border-radius: 9px;
          color: #a1a1aa;
          background: #fafafa;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #27272a;
          background: transparent;
          font-size: 12px;
        }

        .pending-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #52525b;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .action-error {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 11px 13px;
          border: 1px solid #fecaca;
          border-radius: 11px;
          color: #b42318;
          background: #fff1f2;
          font-size: 12px;
          font-weight: 700;
        }

        .queues-container {
          display: grid;
          gap: 22px;
        }

        .queue-section {
          padding: 18px;
          border: 1px solid #e4e4e7;
          border-radius: 19px;
          background: rgba(255, 255, 255, 0.7);
        }

        .queue-section-urgent {
          border-top: 4px solid #d92d20;
        }

        .queue-section-sofi {
          border-top: 4px solid #7f56d9;
        }

        .queue-section-admin {
          border-top: 4px solid #2e90fa;
        }

        .queue-section-personal {
          border-top: 4px solid #dd2590;
        }

        .queue-section-neutral {
          border-top: 4px solid #a1a1aa;
        }

        .queue-section-header {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-bottom: 15px;
        }

        .queue-section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 11px;
        }

        .queue-section-icon-urgent {
          color: #b42318;
          background: #fee4e2;
        }

        .queue-section-icon-sofi {
          color: #6941c6;
          background: #eee7ff;
        }

        .queue-section-icon-admin {
          color: #175cd3;
          background: #eaf2ff;
        }

        .queue-section-icon-personal {
          color: #c11574;
          background: #fce7f6;
        }

        .queue-section-icon-neutral {
          color: #52525b;
          background: #f4f4f5;
        }

        .queue-heading-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .queue-heading-row h2 {
          margin: 0;
          font-size: 18px;
        }

        .queue-heading-row span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: 999px;
          background: #f4f4f5;
          font-size: 11px;
          font-weight: 800;
        }

        .queue-section-header p {
          margin: 4px 0 0;
          color: #71717a;
          font-size: 12px;
        }

        .conversation-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .conversation-card {
          display: flex;
          flex-direction: column;
          gap: 11px;
          padding: 15px;
          border: 1px solid #e4e4e7;
          border-radius: 17px;
          background: white;
          box-shadow: 0 7px 24px rgba(24, 24, 27, 0.045);
          transition:
            transform 150ms ease,
            box-shadow 150ms ease;
        }

        .conversation-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 11px 28px rgba(24, 24, 27, 0.07);
        }

        .conversation-urgent {
          border-left: 4px solid #d92d20;
        }

        .conversation-sofi {
          border-left: 4px solid #7f56d9;
        }

        .conversation-admin {
          border-left: 4px solid #2e90fa;
        }

        .conversation-personal {
          border-left: 4px solid #dd2590;
        }

        .conversation-neutral {
          border-left: 4px solid #a1a1aa;
        }

        .client-card {
          border-color: #f5c451;
          background: linear-gradient(180deg, #fffdf2 0%, #ffffff 46%);
          box-shadow: 0 8px 28px rgba(180, 120, 0, 0.08);
        }

        .client-star {
          flex: 0 0 auto;
          color: #d79b00;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .profile-area {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .instagram-avatar-ring {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          padding: 2px;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            #feda75,
            #fa7e1e,
            #d62976,
            #962fbf,
            #4f5bd5
          );
        }

        .instagram-avatar {
          width: 44px;
          height: 44px;
          border: 2px solid white;
          border-radius: 999px;
          object-fit: cover;
          background: #f4f4f5;
        }

        .avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: #27272a;
          font-size: 15px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .profile-copy {
          min-width: 0;
        }

        .username-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .username-row strong {
          max-width: 200px;
          overflow: hidden;
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .verified-icon {
          flex: 0 0 auto;
          color: #2e90fa;
        }

        .real-name {
          display: block;
          margin-top: 2px;
          color: #71717a;
          font-size: 11px;
        }

        .relationship-signals {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 5px;
        }

        .relationship-signals span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 750;
        }

        .relationship-positive {
          color: #067647;
          background: #dcfae6;
        }

        .relationship-negative {
          color: #b42318;
          background: #fee4e2;
        }

        .relationship-neutral {
          color: #52525b;
          background: #f4f4f5;
        }

        .top-tags {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 5px;
          max-width: 55%;
        }

        .compact-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .queue-tag-urgent {
          color: #b42318;
          background: #fee4e2;
        }

        .queue-tag-sofi {
          color: #6941c6;
          background: #eee7ff;
        }

        .queue-tag-admin {
          color: #175cd3;
          background: #eaf2ff;
        }

        .queue-tag-personal {
          color: #c11574;
          background: #fce7f6;
        }

        .queue-tag-neutral {
          color: #52525b;
          background: #f4f4f5;
        }

        .score-tag {
          color: #067647;
          background: #dcfae6;
        }

        .urgency-tag {
          color: #b54708;
          background: #fef0c7;
        }

        .urgency-tag.urgency-high {
          color: #b42318;
          background: #fee4e2;
        }

        .classification-tag {
          color: #475467;
          background: #f2f4f7;
        }

        .status-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .status-pill,
        .automation-pill,
        .manual-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
        }

        .status-pending,
        .status-bot_answered {
          color: #b54708;
          background: #fef0c7;
        }

        .status-incomplete,
        .status-follow_up {
          color: #b42318;
          background: #fee4e2;
        }

        .status-answered {
          color: #175cd3;
          background: #eaf2ff;
        }

        .status-resolved {
          color: #067647;
          background: #dcfae6;
        }

        .status-personal {
          color: #c11574;
          background: #fce7f6;
        }

        .status-closed {
          color: #52525b;
          background: #f4f4f5;
        }

        .automation-pill {
          color: #6941c6;
          background: #eee7ff;
        }

        .manual-pill {
          color: #475467;
          background: #f2f4f7;
        }

        .client-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 7px;
          border-radius: 999px;
          color: #8a5a00;
          background: #fff1b8;
          font-size: 9px;
          font-weight: 850;
        }

        .resolution-alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px;
          border: 1px solid #fda29b;
          border-radius: 11px;
          color: #b42318;
          background: #fff4ed;
        }

        .resolution-alert svg {
          flex: 0 0 auto;
        }

        .resolution-alert strong {
          display: block;
          font-size: 11px;
        }

        .resolution-alert p {
          margin: 3px 0 0;
          color: #912018;
          font-size: 10px;
          line-height: 1.4;
        }

        .unresolved-inline {
          padding: 8px 10px;
          border-radius: 10px;
          color: #7a2e0e;
          background: #fffaeb;
          font-size: 10px;
          line-height: 1.4;
        }

        .conversation-thread {
          min-width: 0;
          height: 260px;
          padding: 10px;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          background: #ffffff;
        }

        .conversation-thread-empty {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .thread-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .thread-heading > div {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #6941c6;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .thread-heading small {
          color: #a1a1aa;
          font-size: 9px;
        }

        .load-thread-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          min-height: 42px;
          margin: auto 0;
          border: 1px solid #d8b4fe;
          border-radius: 10px;
          color: #6941c6;
          background: #faf5ff;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .load-thread-button:hover:not(:disabled) {
          background: #f3e8ff;
        }

        .load-thread-button:disabled,
        .refresh-thread-button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .refresh-thread-button {
          padding: 0;
          border: 0;
          color: #6941c6;
          background: transparent;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .thread-scroll {
          height: calc(100% - 27px);
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 5px 4px 7px;
          border-radius: 9px;
          background:
            linear-gradient(#fafafa 30%, rgba(250, 250, 250, 0)),
            linear-gradient(rgba(250, 250, 250, 0), #fafafa 70%) 0 100%,
            #fafafa;
          scrollbar-width: thin;
          scrollbar-color: #d4d4d8 transparent;
        }

        .thread-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .thread-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #d4d4d8;
        }

        .thread-message-row {
          display: flex;
          margin: 5px 0;
        }

        .thread-inbound {
          justify-content: flex-start;
        }

        .thread-outbound {
          justify-content: flex-end;
        }

        .thread-bubble {
          max-width: 82%;
          padding: 8px 10px;
          border-radius: 15px;
          box-shadow: 0 1px 2px rgba(24, 24, 27, 0.04);
        }

        .bubble-inbound {
          border-bottom-left-radius: 5px;
          color: #27272a;
          background: #f1f1f3;
        }

        .bubble-outbound {
          border-bottom-right-radius: 5px;
          color: white;
          background: linear-gradient(135deg, #833ab4, #c13584);
        }

        .bubble-automation {
          border-bottom-right-radius: 5px;
          color: #5b21b6;
          background: #ede9fe;
        }

        .thread-bubble p {
          margin: 0;
          font-size: 10px;
          line-height: 1.42;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .thread-bubble small {
          display: block;
          margin-top: 4px;
          font-size: 8px;
          opacity: 0.68;
        }

        .audio-message-label {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
          font-size: 8px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .thread-error {
          margin: 8px 0;
          color: #b42318;
          font-size: 10px;
        }

        .thread-no-messages {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #a1a1aa;
          font-size: 10px;
        }

        .compact-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .compact-summary > div {
          min-width: 0;
          padding: 9px 10px;
          border-radius: 10px;
          background: #f4f4f5;
        }

        .compact-summary > div:last-child {
          color: #175cd3;
          background: #eff8ff;
        }

        .compact-summary span {
          display: block;
          margin-bottom: 4px;
          font-size: 9px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .compact-summary .expandable-text p {
          margin: 0;
          font-size: 10px;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .expandable-text {
          min-width: 0;
        }

        .expand-button {
          margin-top: 5px;
          padding: 0;
          border: 0;
          color: #6941c6;
          background: transparent;
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
        }

        .expand-button:hover {
          text-decoration: underline;
        }

        .card-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 7px;
        }

        .secondary-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 100%;
          min-height: 34px;
          padding: 8px 10px;
          border: 1px solid #e4e4e7;
          border-radius: 9px;
          color: #3f3f46;
          background: white;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
        }

        .action-button:hover:not(:disabled) {
          border-color: #a1a1aa;
          background: #fafafa;
        }

        .action-button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .action-button.action-active {
          border-color: #c4b5fd;
          color: #6941c6;
          background: #f5f3ff;
        }

        .client-button {
          color: #8a5a00;
        }

        .client-button.client-active {
          border-color: #f4c152;
          color: #7a4b00;
          background: #fff7d6;
        }

        .personal-button {
          color: #c11574;
        }

        .personal-button.personal-active {
          border-color: #f9a8d4;
          color: #9d174d;
          background: #fdf2f8;
        }

        .instagram-action {
          width: 100%;
          margin-left: 0;
        }

        .action-disabled {
          opacity: 0.45;
          cursor: default;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 9px;
          border-top: 1px solid #f1f1f3;
          color: #a1a1aa;
          font-size: 9px;
        }

        .waiting-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #52525b;
        }

        .waiting-indicator span {
          color: #a1a1aa;
        }

        .waiting-danger,
        .waiting-danger svg {
          color: #b42318;
        }

        .empty-state,
        .page-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 38px;
          color: #71717a;
          text-align: center;
        }

        .empty-state strong,
        .page-state strong {
          color: #3f3f46;
        }

        .empty-state span {
          font-size: 11px;
        }

        .error-state {
          color: #b42318;
          border: 1px solid #fecaca;
          border-radius: 14px;
          background: #fff1f2;
        }

        .summary-view {
          padding: 14px;
          border: 1px solid #e4e4e7;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.72);
          overflow: hidden;
        }

        .summary-view-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 11px;
        }

        .summary-view-heading h2 {
          margin: 0;
          font-size: 17px;
        }

        .summary-view-heading p {
          margin: 3px 0 0;
          color: #71717a;
          font-size: 10px;
        }

        .summary-view-heading > span {
          padding: 5px 8px;
          border-radius: 999px;
          color: #52525b;
          background: #f4f4f5;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .summary-board {
          display: grid;
          grid-template-columns: repeat(4, minmax(225px, 1fr));
          gap: 9px;
          align-items: start;
          overflow-x: auto;
          padding-bottom: 3px;
        }

        .summary-column {
          min-width: 0;
          padding: 8px;
          border: 1px solid #e4e4e7;
          border-top: 3px solid #a1a1aa;
          border-radius: 13px;
          background: #f8f8f9;
        }

        .summary-column-hot {
          border-top-color: #d92d20;
        }

        .summary-column-sofi {
          border-top-color: #7f56d9;
        }

        .summary-column-admin {
          border-top-color: #2e90fa;
        }

        .summary-column-unassigned {
          border-top-color: #a1a1aa;
        }

        .summary-column-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 28px;
          margin-bottom: 7px;
          padding: 0 2px;
        }

        .summary-column-heading > div {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #3f3f46;
        }

        .summary-column-hot .summary-column-heading > div {
          color: #b42318;
        }

        .summary-column-sofi .summary-column-heading > div {
          color: #6941c6;
        }

        .summary-column-admin .summary-column-heading > div {
          color: #175cd3;
        }

        .summary-column-heading strong {
          font-size: 11px;
        }

        .summary-column-heading > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          color: #52525b;
          background: white;
          font-size: 9px;
          font-weight: 850;
        }

        .summary-column-list {
          display: grid;
          gap: 7px;
        }

        .summary-column-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 70px;
          padding: 10px;
          border: 1px dashed #d4d4d8;
          border-radius: 10px;
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.6);
          font-size: 9px;
          text-align: center;
        }

        .summary-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          min-height: 118px;
          padding: 8px;
          border: 1px solid #e4e4e7;
          border-radius: 11px;
          background: white;
          box-shadow: 0 3px 12px rgba(24, 24, 27, 0.035);
          transition:
            transform 140ms ease,
            box-shadow 140ms ease;
        }

        .summary-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 18px rgba(24, 24, 27, 0.065);
        }

        .summary-card-client {
          background: linear-gradient(180deg, #fffdf3, #fffef9);
          box-shadow:
            inset 0 0 0 1px #fde68a,
            0 3px 12px rgba(24, 24, 27, 0.035);
        }

        .summary-card-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 6px;
        }

        .summary-profile {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .summary-avatar-ring {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 32px;
          width: 32px;
          height: 32px;
          padding: 2px;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            #feda75,
            #fa7e1e,
            #d62976,
            #962fbf,
            #4f5bd5
          );
        }

        .summary-avatar {
          width: 28px;
          height: 28px;
          border: 2px solid white;
          border-radius: 999px;
          object-fit: cover;
          background: #f4f4f5;
        }

        .summary-avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: #27272a;
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .summary-profile-copy {
          min-width: 0;
        }

        .summary-name-row {
          display: flex;
          align-items: center;
          gap: 3px;
          min-width: 0;
        }

        .summary-name-row strong {
          max-width: 105px;
          overflow: hidden;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-profile-copy > span {
          display: block;
          max-width: 105px;
          overflow: hidden;
          margin-top: 1px;
          color: #71717a;
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-header-tags {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 3px;
          min-width: 0;
        }

        .summary-header-tags span {
          display: inline-flex;
          align-items: center;
          padding: 3px 5px;
          border-radius: 999px;
          color: #52525b;
          background: #f4f4f5;
          font-size: 7px;
          font-weight: 850;
          white-space: nowrap;
        }

        .summary-header-tags .summary-urgency-high {
          color: #b42318;
          background: #fee4e2;
        }

        .summary-actions-menu {
          position: relative;
          flex: 0 0 auto;
        }

        .summary-actions-menu summary {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 27px;
          height: 27px;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          color: #52525b;
          background: white;
          cursor: pointer;
          list-style: none;
        }

        .summary-actions-menu summary::-webkit-details-marker {
          display: none;
        }

        .summary-actions-menu[open] summary {
          border-color: #c4b5fd;
          color: #6941c6;
          background: #f5f3ff;
        }

        .summary-actions-dropdown {
          position: absolute;
          z-index: 40;
          top: 32px;
          right: 0;
          display: grid;
          min-width: 180px;
          padding: 5px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          background: white;
          box-shadow: 0 14px 35px rgba(24, 24, 27, 0.16);
        }

        .summary-actions-dropdown button,
        .summary-actions-dropdown a,
        .summary-disabled-action {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          padding: 8px;
          border: 0;
          border-radius: 7px;
          color: #3f3f46;
          background: transparent;
          font: inherit;
          font-size: 9px;
          font-weight: 750;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
        }

        .summary-actions-dropdown button:hover:not(:disabled),
        .summary-actions-dropdown a:hover {
          background: #f4f4f5;
        }

        .summary-actions-dropdown button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .summary-disabled-action {
          opacity: 0.45;
          cursor: default;
        }

        .summary-text {
          min-height: 33px;
          padding: 6px 7px;
          border-radius: 8px;
          background: #fafafa;
        }

        .summary-text p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0;
          color: #3f3f46;
          font-size: 8.5px;
          line-height: 1.35;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .summary-alert {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          padding: 5px 6px;
          border-radius: 7px;
          color: #b42318;
          background: #fff1f0;
          font-size: 7px;
          line-height: 1.2;
        }

        .summary-alert svg {
          flex: 0 0 auto;
        }

        .summary-alert span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding-top: 5px;
          border-top: 1px solid #f1f1f3;
          color: #a1a1aa;
          font-size: 7px;
        }

        .summary-card-bottom span {
          max-width: 55%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 1600px) {
          .metrics-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 1250px) {
          .summary-board {
            grid-template-columns: repeat(4, minmax(220px, 1fr));
          }

          .conversation-grid {
            grid-template-columns: 1fr;
          }

          .control-bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .filters {
            width: 100%;
          }

          .search-box {
            flex: 1;
          }
        }

        @media (max-width: 850px) {
          .dashboard-page {
            padding: 18px;
          }

          .dashboard-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .tabs {
            width: 100%;
            overflow-x: auto;
          }

          .filters {
            align-items: stretch;
            flex-direction: column;
          }

          .search-box {
            width: 100%;
          }

          .card-header {
            flex-direction: column;
          }

          .top-tags {
            justify-content: flex-start;
            max-width: 100%;
          }
        }


        /* Vista horizontal: una conversación por fila */
        .conversation-grid {
          grid-template-columns: 1fr;
        }

        .conversation-card {
          display: grid;
          grid-template-columns:
            minmax(250px, 0.9fr)
            minmax(280px, 1.25fr)
            minmax(280px, 1.15fr)
            minmax(170px, 0.62fr);
          grid-template-areas:
            "header message summary actions"
            "status message summary footer";
          align-items: start;
          column-gap: 14px;
          row-gap: 9px;
          padding: 14px;
        }

        .conversation-card .card-header {
          grid-area: header;
          min-width: 0;
        }

        .conversation-card .status-row {
          grid-area: status;
        }

        .conversation-card .conversation-thread {
          grid-area: message;
          min-width: 0;
          height: 260px;
        }

        .conversation-card .compact-summary {
          grid-area: summary;
          min-width: 0;
          grid-template-columns: 1fr;
          height: 100%;
        }

        .conversation-card .card-actions {
          grid-area: actions;
          display: grid;
          grid-template-columns: 1fr;
          align-content: start;
          gap: 7px;
        }

        .conversation-card .instagram-action {
          margin-left: 0;
        }

        .conversation-card .card-footer {
          grid-area: footer;
          align-self: end;
          flex-direction: column;
          align-items: flex-start;
          border-top: 0;
          padding-top: 0;
        }

        .conversation-card .resolution-alert,
        .conversation-card .unresolved-inline {
          grid-column: 1 / -1;
        }

        .conversation-card .top-tags {
          max-width: 100%;
        }

        .conversation-card .conversation-thread,
        .conversation-card .compact-summary .expandable-text p {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 4;
        }

        @media (max-width: 1450px) {
          .conversation-card {
            grid-template-columns: minmax(240px, 0.9fr) minmax(280px, 1.2fr) minmax(250px, 1fr);
            grid-template-areas:
              "header message summary"
              "status message summary"
              "actions actions footer";
          }

          .conversation-card .card-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1050px) {
          .conversation-card {
            display: flex;
            flex-direction: column;
          }

          .conversation-card .card-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .conversation-card .card-footer {
            width: 100%;
            flex-direction: row;
            align-items: center;
            border-top: 1px solid #f1f1f3;
            padding-top: 9px;
          }
        }

        @media (max-width: 560px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .compact-summary {
            grid-template-columns: 1fr;
          }

          .instagram-action {
            margin-left: 0;
          }
        }
      `}</style>
    </main>
  );
}
