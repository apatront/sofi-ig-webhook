import type React from "react";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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
  last_message_id: string | null;
  last_message_type: string | null;
  last_message_text: string | null;
  last_message_direction: string | null;
  last_user_message_at: string | null;
  last_business_reply_at: string | null;
  updated_at: string | null;
  category: string | null;
  priority: string | null;
  summary: string | null;
  next_action: string | null;
  assigned_to: string | null;
  last_outbound_type: string | null;
  last_automation_reply_at: string | null;
  last_human_reply_at: string | null;
};

async function getConversations(): Promise<Conversation[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select(
      `
      conversation_id,
      ig_account_id,
      external_user_id,
      external_username,
      external_name,
      external_profile_pic,
      is_user_follow_business,
      is_business_follow_user,
      is_verified_user,
      status,
      needs_response,
      last_message_id,
      last_message_type,
      last_message_text,
      last_message_direction,
      last_user_message_at,
      last_business_reply_at,
      updated_at,
      category,
      priority,
      summary,
      next_action,
      assigned_to,
      last_outbound_type,
      last_automation_reply_at,
      last_human_reply_at
    `
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Dashboard Supabase fetch error:", error);
    return [];
  }

  return data || [];
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

function getDisplayName(conversation: Conversation) {
  if (conversation.external_username) {
    return `@${conversation.external_username}`;
  }

  if (conversation.external_name) {
    return conversation.external_name;
  }

  return conversation.external_user_id || "Usuario desconocido";
}

function getStatusLabel(status: string | null, needsResponse: boolean | null) {
  if (needsResponse && status === "bot_answered") return "Bot respondió";
  if (needsResponse) return "Pendiente";
  if (status === "answered") return "Contestada";
  if (status === "closed") return "Cerrada";
  return status || "Sin estado";
}

function getBadgeStyle(status: string | null, needsResponse: boolean | null) {
  if (needsResponse && status === "bot_answered") {
    return {
      ...styles.badge,
      ...styles.badgeBot,
    };
  }

  if (needsResponse) {
    return {
      ...styles.badge,
      ...styles.badgePending,
    };
  }

  return {
    ...styles.badge,
    ...styles.badgeAnswered,
  };
}

function getMessageTypeLabel(messageType: string | null) {
  if (messageType === "audio") return "Nota de voz";
  if (messageType === "image") return "Imagen";
  if (messageType === "video") return "Video";
  if (messageType === "file") return "Archivo";
  return "Texto";
}

export default async function DashboardPage() {
  const conversations = await getConversations();

  const pendingCount = conversations.filter(
    (conversation) => conversation.needs_response
  ).length;

  const answeredCount = conversations.filter(
    (conversation) => conversation.status === "answered"
  ).length;

  const botAnsweredCount = conversations.filter(
    (conversation) => conversation.status === "bot_answered"
  ).length;

  const verifiedCount = conversations.filter(
    (conversation) => conversation.is_verified_user
  ).length;

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Sofi IG Inbox</p>
          <h1 style={styles.title}>Dashboard de conversaciones</h1>
          <p style={styles.subtitle}>
            Conversaciones reales capturadas desde Instagram.
          </p>
        </div>

        <a href="/api/dashboard/logout" style={styles.logoutLink}>
          Cerrar sesión
        </a>
      </section>

      <section style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Conversaciones</p>
          <p style={styles.metricValue}>{conversations.length}</p>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Pendientes</p>
          <p style={styles.metricValue}>{pendingCount}</p>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Contestadas</p>
          <p style={styles.metricValue}>{answeredCount}</p>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Bot respondió</p>
          <p style={styles.metricValue}>{botAnsweredCount}</p>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Verificadas</p>
          <p style={styles.metricValue}>{verifiedCount}</p>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Inbox</h2>
          <p style={styles.cardDescription}>
            Últimas 100 conversaciones, ordenadas por actividad reciente.
          </p>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Usuario</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Último mensaje</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Dirección</th>
                <th style={styles.th}>Tipo salida</th>
                <th style={styles.th}>Sigue</th>
                <th style={styles.th}>Verificada</th>
                <th style={styles.th}>Última actividad</th>
              </tr>
            </thead>

            <tbody>
              {conversations.map((conversation) => (
                <tr key={conversation.conversation_id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      {conversation.external_profile_pic ? (
                        <img
                          src={conversation.external_profile_pic}
                          alt=""
                          style={styles.avatar}
                        />
                      ) : (
                        <div style={styles.avatarFallback}>
                          {getDisplayName(conversation).slice(0, 1)}
                        </div>
                      )}

                      <div>
                        <div style={styles.userName}>
                          {getDisplayName(conversation)}
                        </div>

                        <div style={styles.nameText}>
                          {conversation.external_name || "Sin nombre"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={getBadgeStyle(
                        conversation.status,
                        conversation.needs_response
                      )}
                    >
                      {getStatusLabel(
                        conversation.status,
                        conversation.needs_response
                      )}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={styles.messageCell}>
                      {conversation.last_message_type === "audio" && (
                        <div style={styles.audioLabel}>🎤 Nota de voz</div>
                      )}

                      <div style={styles.messageText}>
                        {conversation.last_message_text || "—"}
                      </div>
                    </div>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.messageTypeBadge}>
                      {getMessageTypeLabel(conversation.last_message_type)}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {conversation.last_message_direction || "—"}
                  </td>

                  <td style={styles.td}>
                    {conversation.last_outbound_type || "—"}
                  </td>

                  <td style={styles.td}>
                    {conversation.is_user_follow_business ? "Sí" : "No"}
                  </td>

                  <td style={styles.td}>
                    {conversation.is_verified_user ? "Sí" : "No"}
                  </td>

                  <td style={styles.td}>
                    {formatDate(conversation.updated_at)}
                  </td>
                </tr>
              ))}

              {conversations.length === 0 && (
                <tr>
                  <td style={styles.emptyState} colSpan={9}>
                    Todavía no hay conversaciones o hubo un error leyendo
                    Supabase.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f3ee",
    color: "#171717",
    padding: "40px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "28px",
  },
  logoutLink: {
    color: "#171717",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
    border: "1px solid #d8cec2",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "#ffffff",
  },
  eyebrow: {
    margin: "0 0 8px",
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7a6f63",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: "36px",
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "10px 0 0",
    color: "#6f6f6f",
    fontSize: "16px",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  metricCard: {
    background: "#ffffff",
    border: "1px solid #e6ded4",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
  },
  metricLabel: {
    margin: 0,
    color: "#766f68",
    fontSize: "14px",
  },
  metricValue: {
    margin: "8px 0 0",
    fontSize: "34px",
    fontWeight: 800,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e6ded4",
    borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "22px 24px",
    borderBottom: "1px solid #eee7df",
  },
  cardTitle: {
    margin: 0,
    fontSize: "22px",
  },
  cardDescription: {
    margin: "6px 0 0",
    color: "#766f68",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    color: "#766f68",
    background: "#fbfaf8",
    borderBottom: "1px solid #eee7df",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f0ebe5",
  },
  td: {
    padding: "14px 16px",
    verticalAlign: "middle",
  },
  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: "220px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    objectFit: "cover",
    background: "#eee",
  },
  avatarFallback: {
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    background: "#171717",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  userName: {
    fontWeight: 800,
  },
  nameText: {
    color: "#766f68",
    fontSize: "13px",
    marginTop: "2px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  badgePending: {
    background: "#fff1d6",
    color: "#8a5200",
  },
  badgeAnswered: {
    background: "#e7f8ec",
    color: "#1f7a3f",
  },
  badgeBot: {
    background: "#e8e0ff",
    color: "#4b2ca3",
  },
  messageCell: {
    minWidth: "320px",
    maxWidth: "420px",
  },
  audioLabel: {
    marginBottom: "5px",
    fontSize: "12px",
    fontWeight: 800,
    color: "#6842a8",
  },
  messageText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  messageTypeBadge: {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "5px 9px",
    background: "#f1ede8",
    color: "#5f554b",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#766f68",
  },
};