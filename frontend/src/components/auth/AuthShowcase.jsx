import { motion } from "framer-motion";
import {
  Check,
  FileText,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";

const previewContent = {
  login: {
    badge: "Session restored",
    title: "Candidate CV review",
    subtitle: "3 improvements and 7 interview prompts ready",
    score: "82%",
    scoreLabel: "Readiness",
    bars: [86, 72, 91, 64],
    actions: [
      "Quantify project outcomes",
      "Clarify technical ownership",
      "Practice role-fit answers",
    ],
    question: "Walk me through the strongest project on your CV.",
  },
  register: {
    badge: "Setup flow",
    title: "New CV analysis",
    subtitle: "Upload, review, and prepare from one workspace",
    score: "3m",
    scoreLabel: "First pass",
    bars: [45, 68, 83, 57],
    actions: [
      "Upload your current CV",
      "Review targeted suggestions",
      "Generate interview questions",
    ],
    question: "Your first practice prompt appears after analysis.",
  },
};

const actionIcons = [UploadCloud, SearchCheck, Sparkles];

function AuthShowcase({ variant = "login" }) {
  const content = previewContent[variant] ?? previewContent.login;

  return (
    <motion.div
      className="relative mt-10 max-w-xl"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: 0.18, ease: "easeOut" }}
    >
      <div className="absolute -inset-x-5 top-8 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />

      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/15 bg-[#101010]/84 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100">
              <FileText size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#f7f5ef]">{content.title}</p>
              <p className="text-xs leading-5 text-zinc-400">{content.subtitle}</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1 text-xs font-semibold text-amber-100">
            {content.badge}
          </span>
        </div>

        <div className="space-y-5">
          <div className="border-y border-white/10 py-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500">{content.scoreLabel}</p>
                <p className="mt-1 text-4xl font-semibold text-[#f7f5ef]">{content.score}</p>
              </div>
              <ShieldCheck size={24} className="mb-1 text-zinc-200" />
            </div>

            <div className="mt-5 space-y-3">
              {content.bars.map((width, index) => (
                <div key={`${width}-${index}`} className="h-2 rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-white via-zinc-200 to-zinc-500"
                    initial={{ width: "12%" }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.85, delay: 0.25 + index * 0.1, ease: "easeOut" }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {content.actions.map((action, index) => {
              const Icon = actionIcons[index] ?? Check;

              return (
                <div key={action} className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100">
                    <Icon size={15} />
                  </span>
                  <p className="text-sm font-medium text-zinc-200">{action}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex gap-3 border-t border-white/10 pt-4">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100">
            <MessageSquareText size={16} />
          </span>
          <div>
            <p className="text-xs font-semibold text-zinc-500">Interview prompt</p>
            <p className="mt-1 text-sm leading-6 text-zinc-300">{content.question}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default AuthShowcase;
