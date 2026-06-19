"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
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

  if (normalized === "high") return "Alta";
  if (normalized === "medium") return "Media";
  if (normalized === "low") return "Baja";

  return "Sin clasificar";
}

function humanize(value: string | null) {
  if (!value) return "Sin clasificar";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ConversationTable({
  title,
  description,
  conversations,
  icon,
  tone,
}: {
  title: string;
  description: string;
  conversations: Conversation[];
  icon: React.ReactNode;
  tone: "urgent" | "sofi" | "admin" | "neutral";
}) {
  return (
    <section className={`queue-card queue-${tone}`}>
      <div className="queue-header">
        <div className="queue-title-group">
          <div className={`queue-icon queue-icon-${tone}`}>{icon}</div>

          <div>
            <div className="queue-title-row">
              <h2>{title}</h2>
              <span className="queue-count">{conversations.length}</span>
            </div>

            <p>{description}</p>
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              <th>Decisión</th>
              <th>Último mensaje</th>
              <th>Contexto</th>
              <th>Esperando</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {conversations.map((conversation) => {
              const waiting = minutesWaiting(conversation);

              return (
                <tr key={conversation.conversation_id}>
                  <td>
                    <div className="person-cell">
                      {conversation.external_profile_pic ? (
                        <img
                          src={conversation.external_profile_pic}
                          alt=""
                          className="avatar"
                        />
                      ) : (
                        <div className="avatar avatar-fallback">
                          {getDisplayName(conversation).slice(0, 1)}
                        </div>
                      )}

                      <div>
                        <div className="person-name-row">
                          <span className="person-username">
                            {getDisplayName(conversation)}
                          </span>

                          {conversation.is_verified_user && (
                            <ShieldCheck size={15} className="verified-icon" />
                          )}
                        </div>

                        <div className="person-real-name">
                          {conversation.external_name || "Sin nombre"}
                        </div>

                        <div className="person-signals">
                          {conversation.is_user_follow_business && (
                            <span>Sigue a Sofi</span>
                          )}

                          {conversation.last_outbound_type === "automation" && (
                            <span className="bot-signal">
                              <Bot size={12} />
                              Bot
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="decision-cell">
                      <span
                        className={`status-badge status-${normalizeText(
                          conversation.status
                        )}`}
                      >
                        {getStatusLabel(conversation)}
                      </span>

                      <span
                        className={`priority-badge priority-${normalizeText(
                          conversation.priority
                        )}`}
                      >
                        {getPriorityLabel(conversation.priority)}
                      </span>

                      <div className="score-row">
                        <span>Lead {conversation.lead_score || 0}</span>
                        <span>Urgencia {conversation.urgency_score || 0}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="message-cell">
                      {conversation.last_message_type === "audio" && (
                        <div className="voice-label">
                          <Mic size={13} />
                          Nota de voz transcrita
                        </div>
                      )}

                      <p>
                        {conversation.last_message_text ||
                          "Sin contenido disponible"}
                      </p>

                      <span className="message-direction">
                        {conversation.last_message_direction === "inbound"
                          ? "Recibido"
                          : "Enviado"}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="context-cell">
                      <span className="category-badge">
                        {humanize(conversation.category)}
                      </span>

                      {conversation.product && (
                        <span className="product-label">
                          {humanize(conversation.product)}
                        </span>
                      )}

                      <p className="summary">
                        {conversation.summary ||
                          "Pendiente de análisis con inteligencia artificial."}
                      </p>

                      <div className="next-action">
                        <ArrowRight size={13} />
                        <span>
                          {conversation.next_action ||
                            "Revisar y definir siguiente acción."}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div
                      className={`waiting-cell ${
                        waiting >= 180 ? "waiting-risk" : ""
                      }`}
                    >
                      <Clock3 size={15} />
                      <strong>{formatWaitingTime(waiting)}</strong>

                      <span>{formatDate(conversation.updated_at)}</span>
                    </div>
                  </td>

                  <td>
                    {conversation.external_username ? (
                      <a
                        className="profile-button"
                        href={`https://www.instagram.com/${conversation.external_username}/`}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir perfil en Instagram"
                      >
                        <ChevronRight size={18} />
                      </a>
                    ) : (
                      <span className="profile-button profile-disabled">
                        <ChevronRight size={18} />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {conversations.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <CheckCircle2 size={28} />
                    <strong>No hay conversaciones en esta cola.</strong>
                    <span>Todo está bajo control.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

  const visibleSections = {
    urgent:
      activeTab === "overview" || activeTab === "urgent" ? urgent : [],
    sofi: activeTab === "overview" || activeTab === "sofi" ? sofi : [],
    admin: activeTab === "overview" || activeTab === "admin" ? admin : [],
    unassigned: activeTab === "overview" ? unassigned : [],
  };

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
        <div className="metric-card metric-danger">
          <div className="metric-icon">
            <AlertTriangle size={20} />
          </div>

          <div>
            <span>Urgentes</span>
            <strong>{urgent.length}</strong>
            <small>Requieren acción inmediata</small>
          </div>
        </div>

        <div className="metric-card metric-sofi">
          <div className="metric-icon">
            <UserRound size={20} />
          </div>

          <div>
            <span>Pendientes de Sofi</span>
            <strong>{sofi.length}</strong>
            <small>Venta, confianza y relación</small>
          </div>
        </div>

        <div className="metric-card metric-admin">
          <div className="metric-icon">
            <Headphones size={20} />
          </div>

          <div>
            <span>Pendientes de Admin</span>
            <strong>{admin.length}</strong>
            <small>Pagos, acceso y operación</small>
          </div>
        </div>

        <div className="metric-card metric-bot">
          <div className="metric-icon">
            <Bot size={20} />
          </div>

          <div>
            <span>Bot respondió</span>
            <strong>{botWaiting}</strong>
            <small>Todavía falta respuesta humana</small>
          </div>
        </div>

        <div className="metric-card metric-sales">
          <div className="metric-icon">
            <CircleDollarSign size={20} />
          </div>

          <div>
            <span>High-ticket activos</span>
            <strong>{highTicket}</strong>
            <small>Oportunidades comerciales</small>
          </div>
        </div>

        <div className="metric-card metric-time">
          <div className="metric-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Espera promedio</span>
            <strong>{formatWaitingTime(averageWaitMinutes)}</strong>
            <small>Conversaciones pendientes</small>
          </div>
        </div>
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
          {visibleSections.urgent.length > 0 ||
          activeTab === "urgent" ||
          activeTab === "overview" ? (
            <ConversationTable
              title="Urgentes"
              description="Conversaciones con riesgo comercial, operativo o de servicio."
              conversations={visibleSections.urgent}
              icon={<AlertTriangle size={20} />}
              tone="urgent"
            />
          ) : null}

          {visibleSections.sofi.length > 0 ||
          activeTab === "sofi" ||
          activeTab === "overview" ? (
            <ConversationTable
              title="Sofi"
              description="Conversaciones donde la voz personal de Sofi puede mover la decisión."
              conversations={visibleSections.sofi}
              icon={<UserRound size={20} />}
              tone="sofi"
            />
          ) : null}

          {visibleSections.admin.length > 0 ||
          activeTab === "admin" ||
          activeTab === "overview" ? (
            <ConversationTable
              title="Admin"
              description="Pagos, accesos, soporte, logística y seguimiento operativo."
              conversations={visibleSections.admin}
              icon={<Headphones size={20} />}
              tone="admin"
            />
          ) : null}

          {visibleSections.unassigned.length > 0 && (
            <ConversationTable
              title="Sin asignar"
              description="Conversaciones que todavía necesitan clasificación."
              conversations={visibleSections.unassigned}
              icon={<MessageCircle size={20} />}
              tone="neutral"
            />
          )}

          {activeTab === "answered" && (
            <ConversationTable
              title="Contestadas"
              description="Historial reciente de conversaciones atendidas o cerradas."
              conversations={answered}
              icon={<CheckCircle2 size={20} />}
              tone="neutral"
            />
          )}
        </div>
      )}

      <style jsx>{`
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
          background: rgba(255, 255, 255, 0.92);
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
          margin-bottom: 22px;
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
          gap: 20px;
        }

        .queue-card {
          overflow: hidden;
          border: 1px solid #e4e4e7;
          border-radius: 20px;
          background: white;
          box-shadow: 0 8px 30px rgba(24, 24, 27, 0.045);
        }

        .queue-urgent {
          border-top: 4px solid #d92d20;
        }

        .queue-sofi {
          border-top: 4px solid #7f56d9;
        }

        .queue-admin {
          border-top: 4px solid #2e90fa;
        }

        .queue-neutral {
          border-top: 4px solid #a1a1aa;
        }

        .queue-header {
          display: flex;
          justify-content: space-between;
          padding: 20px 22px;
          border-bottom: 1px solid #f1f1f3;
        }

        .queue-title-group {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }

        .queue-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
        }

        .queue-icon-urgent {
          color: #b42318;
          background: #fee4e2;
        }

        .queue-icon-sofi {
          color: #6941c6;
          background: #eee7ff;
        }

        .queue-icon-admin {
          color: #175cd3;
          background: #eaf2ff;
        }

        .queue-icon-neutral {
          color: #52525b;
          background: #f4f4f5;
        }

        .queue-title-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .queue-title-row h2 {
          margin: 0;
          font-size: 19px;
        }

        .queue-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 25px;
          height: 25px;
          padding: 0 7px;
          border-radius: 999px;
          background: #f4f4f5;
          font-size: 12px;
          font-weight: 800;
        }

        .queue-header p {
          margin: 5px 0 0;
          color: #71717a;
          font-size: 13px;
        }

        .table-scroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th {
          padding: 12px 16px;
          color: #71717a;
          background: #fafafa;
          border-bottom: 1px solid #ececef;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-align: left;
          text-transform: uppercase;
          white-space: nowrap;
        }

        td {
          padding: 16px;
          border-bottom: 1px solid #f1f1f3;
          vertical-align: top;
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        tbody tr:hover {
          background: #fcfcfd;
        }

        .person-cell {
          display: flex;
          gap: 11px;
          min-width: 210px;
        }

        .avatar {
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          background: #f1f1f3;
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

        .person-name-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .person-username {
          max-width: 170px;
          overflow: hidden;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .verified-icon {
          color: #2e90fa;
        }

        .person-real-name {
          margin-top: 3px;
          color: #71717a;
          font-size: 12px;
        }

        .person-signals {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .person-signals span {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 6px;
          border-radius: 999px;
          color: #52525b;
          background: #f4f4f5;
          font-size: 10px;
          font-weight: 750;
        }

        .bot-signal {
          color: #6941c6 !important;
          background: #eee7ff !important;
        }

        .decision-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 7px;
          min-width: 130px;
        }

        .status-badge,
        .priority-badge,
        .category-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
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

        .score-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          color: #a1a1aa;
          font-size: 10px;
        }

        .message-cell {
          min-width: 260px;
          max-width: 390px;
        }

        .voice-label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
          color: #6941c6;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .message-cell p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0;
          color: #27272a;
          font-size: 13px;
          line-height: 1.45;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .message-direction {
          display: block;
          margin-top: 7px;
          color: #a1a1aa;
          font-size: 10px;
          font-weight: 700;
        }

        .context-cell {
          min-width: 290px;
          max-width: 400px;
        }

        .category-badge {
          color: #344054;
          background: #f2f4f7;
        }

        .product-label {
          display: inline-flex;
          margin-left: 6px;
          color: #6941c6;
          font-size: 10px;
          font-weight: 800;
        }

        .summary {
          margin: 8px 0 0;
          color: #52525b;
          font-size: 12px;
          line-height: 1.45;
        }

        .next-action {
          display: flex;
          align-items: flex-start;
          gap: 5px;
          margin-top: 8px;
          color: #175cd3;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.4;
        }

        .next-action svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .waiting-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          min-width: 105px;
          color: #52525b;
        }

        .waiting-cell svg {
          color: #a1a1aa;
        }

        .waiting-cell strong {
          font-size: 14px;
        }

        .waiting-cell span {
          color: #a1a1aa;
          font-size: 10px;
        }

        .waiting-risk {
          color: #b42318;
        }

        .waiting-risk svg {
          color: #d92d20;
        }

        .profile-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          color: #52525b;
          background: white;
          text-decoration: none;
        }

        .profile-button:hover {
          color: #18181b;
          border-color: #a1a1aa;
        }

        .profile-disabled {
          opacity: 0.35;
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

        @media (max-width: 1400px) {
          .metrics-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
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
        }

        @media (max-width: 520px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </main>
  );
}