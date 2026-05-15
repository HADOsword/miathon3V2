import { motion } from "framer-motion";
import {
  Bot,
  BrainCircuit,
  Check,
  FileText,
  MessageSquareText,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { workflowSteps } from "./landingContent";

const workflowIcons = [UploadCloud, BrainCircuit, WandSparkles, MessageSquareText];

function WorkflowVisual() {
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[620px]"
      initial={{ opacity: 0, scale: 0.96, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
    >
      <motion.div
        className="relative"
        animate={{ y: [0, -19, 0], rotate: [0, 0.35, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute -inset-4 rounded-[1,6rem] bg-[linear-gradient(120deg,rgba(245,158,11,0.16),rgba(247,245,239,0.10),transparent)] blur-2xl" />
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/15 bg-[#101010]/88 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-6">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/65 to-transparent" />

          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100">
                <FileText size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#f7f5ef]">Candidate CV</p>
                <p className="text-xs text-zinc-400">Analysis workspace</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1 text-xs font-semibold text-amber-100 sm:block">
              Secure review
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[1.15rem] border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-2 w-28 rounded-full bg-white/70" />
                  <div className="h-2 w-20 rounded-full bg-zinc-300/70" />
                </div>
                <span className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-100">
                  PDF
                </span>
              </div>

              <div className="space-y-3">
                {[92, 70, 84, 58, 78].map((width) => (
                  <div key={width} className="h-2 rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-white via-zinc-200 to-zinc-500 shadow-[0_0_14px_rgba(245,245,240,0.18)]"
                      initial={{ width: "16%" }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.06] p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-100">
                  <Bot size={15} />
                  AI Analyzing
                </div>
                <p className="text-xs leading-5 text-zinc-300">
                  Matching experience, achievements, and interview signals.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {workflowSteps.map((step, index) => {
                const Icon = workflowIcons[index];

                return (
                  <motion.div
                    key={step.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition hover:border-amber-300/20 hover:bg-white/[0.065]"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.45 + index * 0.13 }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[0.07] text-zinc-100">
                        <Icon size={16} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#f7f5ef]">{step.label}</h3>
                          {index !== 1 && <Check size={14} className="text-zinc-100" />}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">{step.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>


    </motion.div>
  );
}

export default WorkflowVisual;
