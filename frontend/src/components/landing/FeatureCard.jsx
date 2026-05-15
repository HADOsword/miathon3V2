import { motion } from "framer-motion";

function FeatureCard({ icon: Icon, title, description, index }) {
  return (
    <motion.article
      className="group relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#101010]/82 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.26)] backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-amber-300/28 hover:bg-white/[0.055] hover:shadow-[0_24px_70px_rgba(0,0,0,0.36)]"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transition group-hover:via-amber-300/60" />
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100 transition group-hover:border-amber-300/35 group-hover:bg-amber-300/[0.12] group-hover:text-amber-100">
        <Icon size={22} />
      </div>
      <h3 className="text-xl font-semibold text-[#f7f5ef]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-400">{description}</p>
    </motion.article>
  );
}

export default FeatureCard;
