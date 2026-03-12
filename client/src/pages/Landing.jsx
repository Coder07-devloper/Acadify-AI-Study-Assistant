import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import downloadGif from "../assets/download.gif";

const Landing = () => {
  const navigate = useNavigate();
  const title = "ACADIFY";
  const sparkles = [
    { top: "8%", left: "12%", size: "h-1.5 w-1.5", color: "bg-cyan-200", delay: 0.2, duration: 2.4 },
    { top: "14%", left: "72%", size: "h-1 w-1", color: "bg-sky-300", delay: 0.8, duration: 2.8 },
    { top: "22%", left: "88%", size: "h-1.5 w-1.5", color: "bg-blue-300", delay: 0.4, duration: 3 },
    { top: "30%", left: "18%", size: "h-1 w-1", color: "bg-white", delay: 1.1, duration: 2.6 },
    { top: "38%", left: "80%", size: "h-2 w-2", color: "bg-cyan-100", delay: 0.5, duration: 3.2 },
    { top: "46%", left: "8%", size: "h-1.5 w-1.5", color: "bg-sky-200", delay: 1.4, duration: 2.7 },
    { top: "52%", left: "65%", size: "h-1 w-1", color: "bg-blue-200", delay: 0.9, duration: 2.5 },
    { top: "60%", left: "28%", size: "h-2 w-2", color: "bg-cyan-200", delay: 0.1, duration: 3.1 },
    { top: "68%", left: "90%", size: "h-1.5 w-1.5", color: "bg-white", delay: 1.6, duration: 2.9 },
    { top: "74%", left: "14%", size: "h-1 w-1", color: "bg-sky-300", delay: 0.7, duration: 2.3 },
    { top: "82%", left: "58%", size: "h-1.5 w-1.5", color: "bg-cyan-100", delay: 1.2, duration: 2.8 },
    { top: "88%", left: "36%", size: "h-2 w-2", color: "bg-blue-200", delay: 0.3, duration: 3.3 },
  ];

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center text-center px-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14)_0,_transparent_38%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(34,211,238,0.1)_0,_transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04)_0,_transparent_55%)]" />
        {sparkles.map((sparkle, index) => (
          <motion.span
            key={`sparkle-${index}`}
            className={`absolute rounded-full ${sparkle.size} ${sparkle.color} shadow-[0_0_14px_rgba(255,255,255,0.8)]`}
            style={{ top: sparkle.top, left: sparkle.left }}
            animate={{ opacity: [0.2, 1, 0.3], scale: [0.8, 1.4, 0.9] }}
            transition={{
              duration: sparkle.duration,
              delay: sparkle.delay,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="flex gap-2">
          {title.split("").map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: index * 0.12,
              }}
              className="text-6xl md:text-8xl font-bold tracking-widest text-white"
            >
              {letter}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-6 text-gray-300 text-lg md:text-xl tracking-wide max-w-xl"
        >
          Learn smarter. Study faster. Achieve more.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-12 flex justify-center relative"
        >
          <img
            src={downloadGif}
            alt="Acadify AI Animation"
            className="w-[320px] md:w-[400px] lg:w-[500px] rounded-xl shadow-lg floating"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-12 flex gap-6 justify-center"
        >
          <button
            className="px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition duration-300"
            onClick={() => navigate("/register")}
          >
            Get Started
          </button>
          <button
            className="px-7 py-3 rounded-full border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white font-semibold transition duration-300"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Landing;
