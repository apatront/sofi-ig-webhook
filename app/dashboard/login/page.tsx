import type React from "react";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function DashboardLoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  const hasError = params?.error === "1";
  const nextPath = params?.next || "/dashboard";

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>Sofi IG Inbox</p>

        <h1 style={styles.title}>Acceso al dashboard</h1>

        <p style={styles.subtitle}>
          Ingresa la contraseña para ver las conversaciones de Instagram.
        </p>

        <form method="POST" action="/api/dashboard/login" style={styles.form}>
          <input type="hidden" name="next" value={nextPath} />

          <label style={styles.label} htmlFor="password">
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="Escribe la contraseña"
            required
            style={styles.input}
          />

          {hasError && (
            <p style={styles.error}>
              Contraseña incorrecta. Intenta otra vez.
            </p>
          )}

          <button type="submit" style={styles.button}>
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f3ee",
    color: "#171717",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    border: "1px solid #e6ded4",
    borderRadius: "22px",
    padding: "32px",
    boxShadow: "0 12px 34px rgba(0,0,0,0.06)",
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
    fontSize: "30px",
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "12px 0 24px",
    color: "#6f6f6f",
    fontSize: "15px",
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ddd3c8",
    borderRadius: "12px",
    padding: "13px 14px",
    fontSize: "15px",
    outline: "none",
  },
  error: {
    margin: "2px 0 0",
    color: "#b42318",
    fontSize: "14px",
    fontWeight: 700,
  },
  button: {
    marginTop: "8px",
    border: "none",
    borderRadius: "12px",
    background: "#171717",
    color: "#ffffff",
    padding: "13px 16px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
  },
};