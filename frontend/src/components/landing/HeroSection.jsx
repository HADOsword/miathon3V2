import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import WorkflowVisual from "./WorkflowVisual";

function HeroSection() {
  return (
    <section
      id="about"
      className="relative flex min-h-screen items-center px-5 pb-20 pt-32 sm:px-8 lg:pt-28"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="max-w-3xl">
        
          <motion.h1
            className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-[#f7f5ef] sm:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.08, ease: "easeOut" }}
          >
            Improve Your CV{" "}
            <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(245,245,240,0.18)]">
              With AI
            </span>
          </motion.h1>

          <motion.p
            className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.22, ease: "easeOut" }}
          >
            Upload your CV, get smart feedback, and prepare for interviews with
            personalized questions.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.34, ease: "easeOut" }}
          >
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#f7f5ef] px-6 py-3 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_52px_rgba(245,245,240,0.28)]"
            >
              Analyze My CV
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#f7f5ef] transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08] hover:text-white"
            >
              <PlayCircle size={17} />
              See How It Works
            </a>
          </motion.div>
        </div>

        <WorkflowVisual />
      </div>
    </section>
  );
}

export default HeroSection;
