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
  Heart,
  Headphones,
  Inbox,
  MessageCircle,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  UsersRound,
  UserX,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

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
  | "overview"
  | "urgent"
  | "sofi"
  | "admin"
  | "personal"
  | "resolved";

type QueueTone = "urgent" | "sofi" | "admin" | "personal" | "neutral";
type Assignee = "sofi" | "admin";

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
    return "Vida personal";
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
    return { label: "Urgente", icon: <AlertTriangle size={14} /> };
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
  onAssign,
  onTogglePersonal,
}: {
  conversation: Conversation;
  tone: QueueTone;
  assigningConversationId: string | null;
  personalConversationId: string | null;
  onAssign: (conversationId: string, assignedTo: Assignee) => Promise<void>;
  onTogglePersonal: (
    conversationId: string,
    isPersonal: boolean
  ) => Promise<void>;
}) {
  const waiting = minutesWaiting(conversation);
  const queueMeta = getQueueMeta(tone);
  const isPersonal = isPersonalConversation(conversation);
  const isAssigning = assigningConversationId === conversation.conversation_id;
  const isUpdatingPersonal =
    personalConversationId === conversation.conversation_id;

  const instagramUrl = conversation.external_username
    ? `https://www.instagram.com/${conversation.external_username}/`
    : null;

  const unresolvedItems = Array.isArray(conversation.unresolved_items)
    ? conversation.unresolved_items
    : [];

  return (
    <article className={`conversation-card conversation-${tone}`}>
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
          <span className={`compact-tag queue-tag queue-tag-${tone}`}>
            {queueMeta.icon}
            {queueMeta.label}
          </span>

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
                {humanize(conversation.category)}
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

      <div className="message-panel">
        <div className="panel-label">
          {conversation.last_message_type === "audio" ? (
            <>
              <Mic size={13} />
              Nota de voz
            </>
          ) : (
            <>
              <MessageCircle size={13} />
              Último mensaje
            </>
          )}
        </div>

        <p>
          {conversation.last_message_text || "Sin contenido disponible."}
        </p>
      </div>

      {!isPersonal && (
        <div className="compact-summary">
          <div>
            <span>Resumen</span>
            <p>
              {conversation.summary ||
                "Pendiente de análisis con inteligencia artificial."}
            </p>
          </div>

          <div>
            <span>Siguiente acción</span>
            <p>
              {conversation.next_action ||
                "Revisar la conversación y definir el siguiente paso."}
            </p>
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
              disabled={isAssigning || isUpdatingPersonal}
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
              disabled={isAssigning || isUpdatingPersonal}
              onClick={() => onAssign(conversation.conversation_id, "admin")}
            >
              <Headphones size={14} />
              Admin
            </button>
          </>
        )}

        <button
          type="button"
          className={`action-button personal-button ${
            isPersonal ? "personal-active" : ""
          }`}
          disabled={isAssigning || isUpdatingPersonal}
          onClick={() =>
            onTogglePersonal(conversation.conversation_id, !isPersonal)
          }
        >
          <Heart size={14} />
          {isUpdatingPersonal
            ? "Guardando..."
            : isPersonal
              ? "Sacar de personal"
              : "Vida personal"}
        </button>

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
          <span className="action-button action-disabled">Sin perfil</span>
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

function QueueSection({
  title,
  description,
  conversations,
  icon,
  tone,
  assigningConversationId,
  personalConversationId,
  onAssign,
  onTogglePersonal,
}: {
  title: string;
  description: string;
  conversations: Conversation[];
  icon: ReactNode;
  tone: QueueTone;
  assigningConversationId: string | null;
  personalConversationId: string | null;
  onAssign: (conversationId: string, assignedTo: Assignee) => Promise<void>;
  onTogglePersonal: (
    conversationId: string,
    isPersonal: boolean
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
              onAssign={onAssign}
              onTogglePersonal={onTogglePersonal}
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

  const [activeTab, setActiveTab] =
    useState<DashboardTab>("overview");
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
            "No se pudo actualizar Vida personal."
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
          : "No se pudo actualizar Vida personal."
      );
    } finally {
      setPersonalConversationId(null);
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
    activeTab !== "personal" && activeTab !== "resolved" && onlyActive;

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

          <h1>Centro de conversaciones</h1>

          <p>
            Prioriza ventas, atiende clientas y protege las conversaciones
            personales fuera del flujo de IA.
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
          label="Urgentes"
          value={urgent.length}
          description="Requieren acción inmediata"
          icon={<AlertTriangle size={19} />}
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
          label="Vida personal"
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
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            <Inbox size={15} />
            Vista general
          </button>

          <button
            className={activeTab === "urgent" ? "active urgent-tab" : ""}
            onClick={() => setActiveTab("urgent")}
          >
            <AlertTriangle size={15} />
            Urgentes
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
            Vida personal
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

          {activeTab !== "personal" && activeTab !== "resolved" && (
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
          {(activeTab === "overview" || activeTab === "urgent") && (
            <QueueSection
              title="Urgentes"
              description="Riesgo comercial, operativo o de servicio."
              conversations={visibleUrgent}
              icon={<AlertTriangle size={20} />}
              tone="urgent"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
            />
          )}

          {(activeTab === "overview" || activeTab === "sofi") && (
            <QueueSection
              title="Sofi"
              description="Conversaciones donde la voz personal de Sofi puede mover la decisión."
              conversations={visibleSofi}
              icon={<UserRound size={20} />}
              tone="sofi"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
            />
          )}

          {(activeTab === "overview" || activeTab === "admin") && (
            <QueueSection
              title="Admin"
              description="Pagos, accesos, soporte, logística y seguimiento operativo."
              conversations={visibleAdmin}
              icon={<Headphones size={20} />}
              tone="admin"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
            />
          )}

          {activeTab === "overview" && unassigned.length > 0 && (
            <QueueSection
              title="Sin asignar"
              description="Conversaciones activas pendientes de clasificación."
              conversations={unassigned}
              icon={<MessageCircle size={20} />}
              tone="neutral"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
            />
          )}

          {activeTab === "personal" && (
            <QueueSection
              title="Vida personal"
              description="Amigos y contactos personales excluidos del análisis de IA."
              conversations={personal}
              icon={<Heart size={20} />}
              tone="personal"
              assigningConversationId={assigningConversationId}
              personalConversationId={personalConversationId}
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
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
              onAssign={assignConversation}
              onTogglePersonal={togglePersonalConversation}
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

        .message-panel {
          padding: 10px;
          border: 1px solid #ececef;
          border-radius: 11px;
          background: #fafafa;
        }

        .panel-label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
          color: #6941c6;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .message-panel p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0;
          color: #27272a;
          font-size: 11px;
          line-height: 1.45;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
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

        .compact-summary p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0;
          font-size: 10px;
          line-height: 1.4;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
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

        .personal-button {
          color: #c11574;
        }

        .personal-button.personal-active {
          border-color: #f9a8d4;
          color: #9d174d;
          background: #fdf2f8;
        }

        .instagram-action {
          margin-left: auto;
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

        @media (max-width: 1600px) {
          .metrics-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 1250px) {
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
