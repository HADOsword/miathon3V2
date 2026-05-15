import { motion } from "framer-motion";

function SectionHeading({ eyebrow, title, description, align = "center" }) {
  const alignment = align === "left" ? "items-start text-left" : "items-center text-center";

  return (
    <motion.div
      className={`mx-auto flex max-w-3xl flex-col ${alignment}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <span className="mb-4 inline-flex rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.08)]">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-semibold tracking-normal text-[#f7f5ef] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-300 sm:text-lg">{description}</p>
    </motion.div>
  );
}

export default SectionHeading;
