"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Headphones,
  Inbox,
  MessageCircle,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
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

  lead_score: number | null;
  urgency_score: number | null;
  sort_score: number | null;

  summary: string | null;
  next_action: string | null;
  ai_reasoning: string | null;
  last_ai_analysis_at: string | null;

  conversation_stage: string | null;
  conversion_status: string | null;
  estimated_value: number | null;
  customer_status: string | null;

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

type DashboardTab = "overview" | "urgent" | "sofi" | "admin" | "answered";

type QueueTone = "urgent" | "sofi" | "admin" | "neutral";

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

function minutesWaiting(conversation: Conversation) {
  if (!conversation.needs_response || !conversation.last_user_message_at) {
    return 0;
  }

  const timestamp = new Date(conversation.last_user_message_at).getTime();

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

  const days = Math.floor(hours / 24);
  return `${days} d`;
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
  const explicitQueue = normalizeText(conversation.queue);

  if (explicitQueue === "urgent") return "urgent";
  if (explicitQueue === "sofi") return "sofi";
  if (explicitQueue === "admin") return "admin";

  const waitingMinutes = minutesWaiting(conversation);
  const category = normalizeText(conversation.category);
  const priority = normalizeText(conversation.priority);

  const isUrgent =
    conversation.needs_response &&
    (priority === "high" ||
      (conversation.urgency_score || 0) >= 70 ||
      waitingMinutes >= 180);

  if (isUrgent) return "urgent";

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

  if (waitingMinutes >= 180) score += 30;
  if (waitingMinutes >= 1440) score += 70;

  score += conversation.lead_score || 0;
  score += conversation.urgency_score || 0;

  if (conversation.status === "answered") score -= 200;
  if (conversation.status === "closed") score -= 500;

  return score;
}

function getStatusLabel(conversation: Conversation) {
  if (conversation.status === "bot_answered" && conversation.needs_response) {
    return "Bot respondió";
  }

  if (conversation.needs_response) {
    return "Pendiente";
  }

  if (conversation.status === "answered") {
    return "Contestada";
  }

  if (conversation.status === "closed") {
    return "Cerrada";
  }

  return conversation.status || "Sin estado";
}

function getPriorityLabel(priority: string | null) {
  const normalized = normalizeText(priority);

  if (normalized === "high") return "Prioridad alta";
  if (normalized === "medium") return "Prioridad media";
  if (normalized === "low") return "Prioridad baja";

  return "Sin clasificar";
}

function humanize(value: string | null) {
  if (!value) return "Sin clasificar";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getQueueMeta(tone: QueueTone) {
  if (tone === "urgent") {
    return {
      label: "Urgente",
      icon: <AlertTriangle size={16} />,
    };
  }

  if (tone === "sofi") {
    return {
      label: "Sofi",
      icon: <UserRound size={16} />,
    };
  }

  if (tone === "admin") {
    return {
      label: "Admin",
      icon: <Headphones size={16} />,
    };
  }

  return {
    label: "Sin asignar",
    icon: <MessageCircle size={16} />,
  };
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

function ConversationCard({
  conversation,
  tone,
}: {
  conversation: Conversation;
  tone: QueueTone;
}) {
  const waiting = minutesWaiting(conversation);
  const queueMeta = getQueueMeta(tone);

  const instagramUrl = conversation.external_username
    ? `https://www.instagram.com/${conversation.external_username}/`
    : null;

  return (
    <article className={`conversation-card conversation-${tone}`}>
      <div className="conversation-top-row">
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
                <ShieldCheck size={16} className="verified-icon" />
              )}
            </div>

            <span className="real-name">
              {conversation.external_name || "Sin nombre"}
            </span>

            <div className="profile-signals">
              {conversation.is_user_follow_business && (
                <span>Sigue a Sofi</span>
              )}

              {conversation.is_business_follow_user && (
                <span>Sofi la sigue</span>
              )}
            </div>
          </div>
        </div>

        <div className={`queue-pill queue-pill-${tone}`}>
          {queueMeta.icon}
          {queueMeta.label}
        </div>
      </div>

      <div className="conversation-status-row">
        <span
          className={`status-pill status-${normalizeText(
            conversation.status
          )}`}
        >
          {getStatusLabel(conversation)}
        </span>

        <span
          className={`priority-pill priority-${normalizeText(
            conversation.priority
          )}`}
        >
          {getPriorityLabel(conversation.priority)}
        </span>

        {conversation.last_outbound_type === "automation" && (
          <span className="automation-pill">
            <Bot size={13} />
            Bot
          </span>
        )}
      </div>

      <div className="message-panel">
        <div className="panel-label">
          {conversation.last_message_type === "audio" ? (
            <>
              <Mic size={14} />
              Nota de voz transcrita
            </>
          ) : (
            <>
              <MessageCircle size={14} />
              Último mensaje
            </>
          )}
        </div>

        <p>
          {conversation.last_message_text || "Sin contenido disponible."}
        </p>

        <span className="direction-label">
          {conversation.last_message_direction === "inbound"
            ? "Mensaje recibido"
            : "Mensaje enviado"}
        </span>
      </div>

      <div className="decision-grid">
        <div className="decision-box">
          <span className="decision-label">Categoría</span>
          <strong>{humanize(conversation.category)}</strong>

          {conversation.product && (
            <small>{humanize(conversation.product)}</small>
          )}
        </div>

        <div className="decision-box">
          <span className="decision-label">Intención</span>
          <strong>{humanize(conversation.intent)}</strong>

          {conversation.sentiment && (
            <small>{humanize(conversation.sentiment)}</small>
          )}
        </div>

        <div className="decision-box">
          <span className="decision-label">Lead score</span>
          <strong>{conversation.lead_score || 0}/100</strong>
          <small>Potencial comercial</small>
        </div>

        <div className="decision-box">
          <span className="decision-label">Urgencia</span>
          <strong>{conversation.urgency_score || 0}/100</strong>
          <small>Riesgo de espera</small>
        </div>
      </div>

      <div className="summary-panel">
        <div className="summary-section">
          <span>Resumen</span>

          <p>
            {conversation.summary ||
              "Pendiente de análisis con inteligencia artificial."}
          </p>
        </div>

        <div className="next-action-section">
          <span>Siguiente acción</span>

          <p>
            {conversation.next_action ||
              "Revisar la conversación y definir el siguiente paso."}
          </p>
        </div>
      </div>

      <div className="conversation-footer">
        <div
          className={`waiting-indicator ${
            waiting >= 180 ? "waiting-danger" : ""
          }`}
        >
          <Clock3 size={16} />

          <div>
            <strong>{formatWaitingTime(waiting)}</strong>
            <span>esperando respuesta</span>
          </div>
        </div>

        <div className="footer-right">
          <span className="updated-label">
            {formatDate(conversation.updated_at)}
          </span>

          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="instagram-button"
            >
              Abrir Instagram
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <span className="instagram-button instagram-button-disabled">
              Sin perfil
            </span>
          )}
        </div>
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
}: {
  title: string;
  description: string;
  conversations: Conversation[];
  icon: ReactNode;
  tone: QueueTone;
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
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <CheckCircle2 size={30} />
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
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    }

    loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    const query = normalizeText(search);

    return conversations
      .filter((conversation) => {
        if (onlyPending && !conversation.needs_response) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchable = [
          conversation.external_username,
          conversation.external_name,
          conversation.last_message_text,
          conversation.summary,
          conversation.next_action,
          conversation.category,
          conversation.product,
          conversation.intent,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort(
        (a, b) => getOperationalScore(b) - getOperationalScore(a)
      );
  }, [conversations, onlyPending, search]);

  const urgent = filteredConversations.filter(
    (conversation) => getQueue(conversation) === "urgent"
  );

  const sofi = filteredConversations.filter(
    (conversation) => getQueue(conversation) === "sofi"
  );

  const admin = filteredConversations.filter(
    (conversation) => getQueue(conversation) === "admin"
  );

  const unassigned = filteredConversations.filter(
    (conversation) => getQueue(conversation) === "unassigned"
  );

  const answered = conversations
    .filter(
      (conversation) =>
        !conversation.needs_response ||
        ["answered", "closed"].includes(normalizeText(conversation.status))
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at || 0).getTime() -
        new Date(a.updated_at || 0).getTime()
    );

  const botWaiting = conversations.filter(
    (conversation) =>
      conversation.status === "bot_answered" &&
      conversation.needs_response
  ).length;

  const highTicket = conversations.filter(
    (conversation) =>
      conversation.needs_response &&
      normalizeText(conversation.category) === "high_ticket"
  ).length;

  const waitingConversations = conversations.filter(
    (conversation) => conversation.needs_response
  );

  const averageWaitMinutes =
    waitingConversations.length > 0
      ? Math.round(
          waitingConversations.reduce(
            (sum, conversation) => sum + minutesWaiting(conversation),
            0
          ) / waitingConversations.length
        )
      : 0;

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
            Prioriza ventas, atiende clientas y decide quién debe responder.
          </p>
        </div>

        <div className="header-actions">
          <div className="live-indicator">
            <span />
            Datos en vivo
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
          icon={<AlertTriangle size={20} />}
          tone="danger"
        />

        <MetricCard
          label="Pendientes de Sofi"
          value={sofi.length}
          description="Venta, confianza y relación"
          icon={<UserRound size={20} />}
          tone="sofi"
        />

        <MetricCard
          label="Pendientes de Admin"
          value={admin.length}
          description="Pagos, acceso y operación"
          icon={<Headphones size={20} />}
          tone="admin"
        />

        <MetricCard
          label="Bot respondió"
          value={botWaiting}
          description="Todavía falta respuesta humana"
          icon={<Bot size={20} />}
          tone="bot"
        />

        <MetricCard
          label="High-ticket activos"
          value={highTicket}
          description="Oportunidades comerciales"
          icon={<CircleDollarSign size={20} />}
          tone="sales"
        />

        <MetricCard
          label="Espera promedio"
          value={formatWaitingTime(averageWaitMinutes)}
          description="Conversaciones pendientes"
          icon={<Clock3 size={20} />}
          tone="time"
        />
      </section>

      <section className="control-bar">
        <div className="tabs">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            <Inbox size={16} />
            Vista general
          </button>

          <button
            className={activeTab === "urgent" ? "active urgent-tab" : ""}
            onClick={() => setActiveTab("urgent")}
          >
            <AlertTriangle size={16} />
            Urgentes
          </button>

          <button
            className={activeTab === "sofi" ? "active" : ""}
            onClick={() => setActiveTab("sofi")}
          >
            <UserRound size={16} />
            Sofi
          </button>

          <button
            className={activeTab === "admin" ? "active" : ""}
            onClick={() => setActiveTab("admin")}
          >
            <UsersRound size={16} />
            Admin
          </button>

          <button
            className={activeTab === "answered" ? "active" : ""}
            onClick={() => setActiveTab("answered")}
          >
            <CheckCircle2 size={16} />
            Contestadas
          </button>
        </div>

        <div className="filters">
          <label className="search-box">
            <Search size={17} />

            <input
              type="search"
              placeholder="Buscar nombre, mensaje, producto..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="pending-toggle">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(event) => setOnlyPending(event.target.checked)}
            />

            Solo pendientes
          </label>
        </div>
      </section>

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
              conversations={urgent}
              icon={<AlertTriangle size={21} />}
              tone="urgent"
            />
          )}

          {(activeTab === "overview" || activeTab === "sofi") && (
            <QueueSection
              title="Sofi"
              description="Conversaciones donde la voz personal de Sofi puede mover la decisión."
              conversations={sofi}
              icon={<UserRound size={21} />}
              tone="sofi"
            />
          )}

          {(activeTab === "overview" || activeTab === "admin") && (
            <QueueSection
              title="Admin"
              description="Pagos, accesos, soporte, logística y seguimiento operativo."
              conversations={admin}
              icon={<Headphones size={21} />}
              tone="admin"
            />
          )}

          {activeTab === "overview" && unassigned.length > 0 && (
            <QueueSection
              title="Sin asignar"
              description="Conversaciones pendientes de clasificación."
              conversations={unassigned}
              icon={<MessageCircle size={21} />}
              tone="neutral"
            />
          )}

          {activeTab === "answered" && (
            <QueueSection
              title="Contestadas"
              description="Conversaciones atendidas o cerradas recientemente."
              conversations={answered}
              icon={<CheckCircle2 size={21} />}
              tone="neutral"
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
          padding: 36px;
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
          gap: 24px;
          margin-bottom: 28px;
        }

        .brand-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 9px;
          color: #7250a6;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .dashboard-header p {
          margin: 10px 0 0;
          color: #71717a;
          font-size: 16px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid #e4e4e7;
          border-radius: 999px;
          background: white;
          color: #52525b;
          font-size: 13px;
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
          padding: 10px 14px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          color: #27272a;
          background: white;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .metric-card {
          display: flex;
          gap: 13px;
          min-height: 125px;
          padding: 18px;
          border: 1px solid #e4e4e7;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 8px 30px rgba(24, 24, 27, 0.045);
        }

        .metric-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #f4f4f5;
        }

        .metric-card span {
          display: block;
          color: #71717a;
          font-size: 12px;
          font-weight: 750;
        }

        .metric-card strong {
          display: block;
          margin-top: 5px;
          font-size: 29px;
          line-height: 1;
        }

        .metric-card small {
          display: block;
          margin-top: 9px;
          color: #a1a1aa;
          font-size: 11px;
          line-height: 1.35;
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

        .metric-bot .metric-icon {
          color: #7a5af8;
          background: #f0edff;
        }

        .metric-sales .metric-icon {
          color: #067647;
          background: #dcfae6;
        }

        .metric-time .metric-icon {
          color: #b54708;
          background: #fef0c7;
        }

        .control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
          padding: 11px;
          border: 1px solid #e4e4e7;
          border-radius: 16px;
          background: white;
          box-shadow: 0 6px 24px rgba(24, 24, 27, 0.04);
        }

        .tabs,
        .filters {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .tabs button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border: 0;
          border-radius: 10px;
          color: #71717a;
          background: transparent;
          font-size: 13px;
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

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 310px;
          padding: 9px 11px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          color: #a1a1aa;
          background: #fafafa;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #27272a;
          background: transparent;
          font-size: 13px;
        }

        .pending-toggle {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #52525b;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .queues-container {
          display: grid;
          gap: 28px;
        }

        .queue-section {
          padding: 22px;
          border: 1px solid #e4e4e7;
          border-radius: 22px;
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

        .queue-section-neutral {
          border-top: 4px solid #a1a1aa;
        }

        .queue-section-header {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-bottom: 20px;
        }

        .queue-section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
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

        .queue-section-icon-neutral {
          color: #52525b;
          background: #f4f4f5;
        }

        .queue-heading-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .queue-heading-row h2 {
          margin: 0;
          font-size: 21px;
        }

        .queue-heading-row span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 26px;
          height: 26px;
          padding: 0 7px;
          border-radius: 999px;
          background: #f4f4f5;
          font-size: 12px;
          font-weight: 800;
        }

        .queue-section-header p {
          margin: 5px 0 0;
          color: #71717a;
          font-size: 13px;
        }

        .conversation-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .conversation-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          border: 1px solid #e4e4e7;
          border-radius: 20px;
          background: white;
          box-shadow: 0 8px 30px rgba(24, 24, 27, 0.05);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .conversation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(24, 24, 27, 0.08);
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

        .conversation-neutral {
          border-left: 4px solid #a1a1aa;
        }

        .conversation-top-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
        }

        .profile-area {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .instagram-avatar-ring {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 58px;
          width: 58px;
          height: 58px;
          padding: 3px;
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
          width: 52px;
          height: 52px;
          border: 3px solid white;
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
          font-size: 17px;
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
          max-width: 220px;
          overflow: hidden;
          font-size: 15px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .verified-icon {
          flex: 0 0 auto;
          color: #2e90fa;
        }

        .real-name {
          display: block;
          margin-top: 3px;
          color: #71717a;
          font-size: 12px;
        }

        .profile-signals {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 6px;
        }

        .profile-signals span {
          padding: 3px 6px;
          border-radius: 999px;
          color: #52525b;
          background: #f4f4f5;
          font-size: 9px;
          font-weight: 750;
        }

        .queue-pill {
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          gap: 5px;
          padding: 7px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .queue-pill-urgent {
          color: #b42318;
          background: #fee4e2;
        }

        .queue-pill-sofi {
          color: #6941c6;
          background: #eee7ff;
        }

        .queue-pill-admin {
          color: #175cd3;
          background: #eaf2ff;
        }

        .queue-pill-neutral {
          color: #52525b;
          background: #f4f4f5;
        }

        .conversation-status-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .status-pill,
        .priority-pill,
        .automation-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
        }

        .status-pending,
        .status-bot_answered {
          color: #b54708;
          background: #fef0c7;
        }

        .status-answered {
          color: #067647;
          background: #dcfae6;
        }

        .status-closed {
          color: #52525b;
          background: #f4f4f5;
        }

        .priority-high {
          color: #b42318;
          background: #fee4e2;
        }

        .priority-medium {
          color: #b54708;
          background: #fef0c7;
        }

        .priority-low {
          color: #475467;
          background: #f2f4f7;
        }

        .automation-pill {
          color: #6941c6;
          background: #eee7ff;
        }

        .message-panel {
          padding: 14px;
          border: 1px solid #ececef;
          border-radius: 14px;
          background: #fafafa;
        }

        .panel-label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 8px;
          color: #6941c6;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .message-panel p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0;
          color: #27272a;
          font-size: 13px;
          line-height: 1.5;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 4;
        }

        .direction-label {
          display: block;
          margin-top: 8px;
          color: #a1a1aa;
          font-size: 10px;
          font-weight: 700;
        }

        .decision-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .decision-box {
          min-height: 82px;
          padding: 10px;
          border: 1px solid #ececef;
          border-radius: 12px;
          background: white;
        }

        .decision-label {
          display: block;
          color: #a1a1aa;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .decision-box strong {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          line-height: 1.25;
        }

        .decision-box small {
          display: block;
          margin-top: 4px;
          color: #71717a;
          font-size: 9px;
          line-height: 1.3;
        }

        .summary-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .summary-section,
        .next-action-section {
          padding: 12px;
          border-radius: 13px;
        }

        .summary-section {
          background: #f4f4f5;
        }

        .next-action-section {
          color: #175cd3;
          background: #eff8ff;
        }

        .summary-section span,
        .next-action-section span {
          display: block;
          margin-bottom: 5px;
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .summary-section p,
        .next-action-section p {
          margin: 0;
          font-size: 11px;
          line-height: 1.45;
        }

        .conversation-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          padding-top: 14px;
          border-top: 1px solid #f1f1f3;
        }

        .waiting-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #52525b;
        }

        .waiting-indicator svg {
          color: #a1a1aa;
        }

        .waiting-indicator strong {
          display: block;
          font-size: 14px;
        }

        .waiting-indicator span {
          display: block;
          margin-top: 1px;
          color: #a1a1aa;
          font-size: 9px;
        }

        .waiting-danger,
        .waiting-danger svg {
          color: #b42318;
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .updated-label {
          color: #a1a1aa;
          font-size: 9px;
        }

        .instagram-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 11px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          color: #27272a;
          background: white;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .instagram-button:hover {
          border-color: #a1a1aa;
          background: #fafafa;
        }

        .instagram-button-disabled {
          opacity: 0.45;
        }

        .empty-state,
        .page-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 42px;
          color: #71717a;
          text-align: center;
        }

        .empty-state strong,
        .page-state strong {
          color: #3f3f46;
        }

        .empty-state span {
          font-size: 12px;
        }

        .error-state {
          color: #b42318;
          border: 1px solid #fecaca;
          border-radius: 16px;
          background: #fff1f2;
        }

        @media (max-width: 1500px) {
          .metrics-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .decision-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1150px) {
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

        @media (max-width: 800px) {
          .dashboard-page {
            padding: 20px;
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

          .summary-panel {
            grid-template-columns: 1fr;
          }

          .conversation-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .footer-right {
            width: 100%;
            justify-content: space-between;
          }
        }

        @media (max-width: 560px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .conversation-top-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .decision-grid {
            grid-template-columns: 1fr 1fr;
          }

          .queue-pill {
            align-self: flex-start;
          }
        }
      `}</style>
    </main>
  );
}