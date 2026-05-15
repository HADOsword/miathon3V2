import { motion } from "framer-motion";

function StepCard({ icon: Icon, step, title, description, index }) {
  return (
    <motion.article
      className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#101010]/78 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.26)] backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-amber-300/25 hover:bg-white/[0.045]"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="mb-8 flex items-center justify-between">
        <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-100">
          {step}
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100">
          <Icon size={20} />
        </span>
      </div>
      <h3 className="text-xl font-semibold text-[#f7f5ef]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-400">{description}</p>
    </motion.article>
  );
}

export default StepCard;
