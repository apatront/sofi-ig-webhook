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
};

async function getConversations(): Promise<Conversation[]> {
  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/dashboard/conversations`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }

  const json = await response.json();

  return json.conversations || [];
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
  if (needsResponse) return "Pendiente";
  if (status === "answered") return "Contestada";
  if (status === "closed") return "Cerrada";
  return status || "Sin estado";
}

export default async function DashboardPage() {
  const conversations = await getConversations();

  const pendingCount = conversations.filter(
    (conversation) => conversation.needs_response
  ).length;

  const answeredCount = conversations.filter(
    (conversation) => conversation.status === "answered"
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
            Conversaciones reales capturadas desde Instagram, guardadas en
            Supabase.
          </p>
        </div>
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
                <th style={styles.th}>Dirección</th>
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
                      style={{
                        ...styles.badge,
                        ...(conversation.needs_response
                          ? styles.badgePending
                          : styles.badgeAnswered),
                      }}
                    >
                      {getStatusLabel(
                        conversation.status,
                        conversation.needs_response
                      )}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={styles.messageText}>
                      {conversation.last_message_text || "—"}
                    </div>
                  </td>

                  <td style={styles.td}>
                    {conversation.last_message_direction || "—"}
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
                  <td style={styles.emptyState} colSpan={7}>
                    Todavía no hay conversaciones.
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "28px",
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
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
  messageText: {
    maxWidth: "360px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#766f68",
  },
};