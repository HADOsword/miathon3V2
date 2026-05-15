import { motion } from "framer-motion";

function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#030303]">
      <div className="absolute inset-0 cv-grid opacity-[0.18]" />
      <motion.div
        aria-hidden="true"
        className="absolute left-[-25%] top-16 h-40 w-[150%] bg-[linear-gradient(90deg,transparent,rgba(245,245,240,0.15),rgba(161,161,170,0.08),transparent)] blur-3xl"
        animate={{ x: ["-8%", "8%", "-8%"], opacity: [0.24, 0.42, 0.24] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute bottom-[-14rem] left-[-10%] h-[32rem] w-[120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.09),rgba(113,113,122,0.08),transparent)] blur-3xl"
        animate={{ x: ["6%", "-6%", "6%"], opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,0.24),#030303_88%)]" />
    </div>
  );
}

export default AmbientBackground;
