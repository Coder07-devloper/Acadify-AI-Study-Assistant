import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlowLayout from "../components/Glowlayout.jsx";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const name = params.get("name");
    const email = params.get("email");

    if (token) {
      localStorage.setItem("token", token);
      if (name) {
        localStorage.setItem("userName", name);
      }
      if (email) {
        localStorage.setItem("userEmail", email);
      }
      navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/login", { replace: true });
  }, [navigate, params]);

  return (
    <GlowLayout>
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h1 style={styles.title}>Signing you in…</h1>
          <p style={styles.text}>Please wait.</p>
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
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(15px)",
    padding: "40px",
    borderRadius: "20px",
    width: "350px",
    textAlign: "center",
    boxShadow: "0 0 40px rgba(0,150,255,0.3)",
  },
  title: {
    marginBottom: "10px",
    fontSize: "22px",
  },
  text: {
    margin: 0,
    opacity: 0.8,
  },
};

export default OAuthCallback;

