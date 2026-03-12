const GlowLayout = ({ children }) => {
    return (
      <div style={styles.container}>
        <div style={styles.glow}></div>
        {children}
      </div>
    );
  };
  
  const styles = {
    container: {
      minHeight: "100vh",
      background: "radial-gradient(circle at center, #0f2027, #0b0c2a, #000)",
      color: "white",
      position: "relative",
      overflow: "hidden",
    },
    glow: {
      position: "absolute",
      width: "600px",
      height: "600px",
      background: "radial-gradient(circle, rgba(0,150,255,0.4), transparent 70%)",
      top: "-200px",
      right: "-200px",
      filter: "blur(120px)",
      zIndex: 0,
    },
  };
  
  export default GlowLayout;