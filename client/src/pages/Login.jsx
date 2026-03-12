import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import GlowLayout from "../components/Glowlayout.jsx";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  const handleGithubLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/github";
  };

  const handleLogin = async () => {
    try {
      const res = await API.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      if (res.data.user?.name) {
        localStorage.setItem("userName", res.data.user.name);
      }
      if (res.data.user?.email) {
        localStorage.setItem("userEmail", res.data.user.email);
      }
      navigate("/dashboard");
    } catch (err) {
      alert("Invalid credentials");
    }
  };

  return (
    <GlowLayout>
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h1 style={styles.title}>Welcome Back</h1>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button onClick={handleLogin} style={styles.button}>
            Login
          </button>

          <div style={styles.dividerRow}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          <button onClick={handleGoogleLogin} style={styles.oauthButton}>
            Continue with Google
          </button>

          <button onClick={handleGithubLogin} style={styles.oauthButtonAlt}>
            Continue with GitHub
          </button>
        </div>
      </div>
    </GlowLayout>
  );
};

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "#e0f2ff",
    color: "#111827",
    padding: "48px 40px",
    borderRadius: "24px",
    width: "420px",
    textAlign: "center",
    boxShadow: "0 24px 60px rgba(15,23,42,0.55)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    fontWeight: 500
  },
  title: {
    marginBottom: "24px",
    fontSize: "30px",
    fontWeight: 700,
    color: "#0f172a",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "16px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#f3f4f6",
    color: "#111827",
    fontSize: "14px",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "999px",
    border: "none",
    background: "linear-gradient(90deg, #00c6ff, #0072ff)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 0 15px rgba(0,150,255,0.6)",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "18px 0",
    opacity: 0.8,
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e5e7eb",
  },
  dividerText: {
    fontSize: "12px",
    color: "#6b7280",
  },
  oauthButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#111827",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "10px",
  },
  oauthButtonAlt: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    background: "#f3f4f6",
    color: "#111827",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default Login;