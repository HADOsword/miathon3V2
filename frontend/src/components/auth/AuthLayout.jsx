import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import AuthShowcase from "./AuthShowcase";
import AmbientBackground from "../landing/AmbientBackground";
import BrandLogo from "../landing/BrandLogo";

function AuthLayout({
  activeMode,
  eyebrow,
  title,
  description,
  children,
  footer,
  sideTitle,
  sideDescription,
  highlights = [],
  visualVariant = "login",
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-[#f7f5ef]">
      <AmbientBackground />

      <header className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-[4.5rem] sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="CVMentor AI home">
          <BrandLogo compact />
        </Link>

        <Link
          to="/"
          className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08] hover:text-white sm:w-auto sm:px-4"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Home</span>
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-7xl flex-col gap-8 px-5 pb-10 pt-4 sm:min-h-[calc(100vh-4.5rem)] sm:px-8 sm:pt-6 lg:pb-16 lg:pt-6">
        <motion.aside
          className="min-w-0"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >

          <h2 className="max-w-xl text-4xl font-semibold leading-tight text-[#f7f5ef] xl:text-5xl">
            {sideTitle}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            {sideDescription}
          </p>

          <AuthShowcase variant={visualVariant} />

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {highlights.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
              <div key={itemTitle} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100">
                  <Icon size={19} />
                </span>
                <h3 className="text-sm font-semibold text-[#f7f5ef]">{itemTitle}</h3>
                <p className="mt-2 hidden text-sm leading-6 text-zinc-400 2xl:block">
                  {itemDescription}
                </p>
              </div>
            ))}
          </div>
        </motion.aside>

        <motion.section
          className="relative mx-auto w-full min-w-0 max-w-md overflow-hidden rounded-[1.6rem] border border-white/15 bg-[linear-gradient(135deg,rgba(16,16,16,0.96),rgba(8,8,8,0.9))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: -50}}
          transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/65 to-transparent" />

          <div className="mb-7 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <Link
              to="/login"
              className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                activeMode === "login"
                  ? "bg-[#f7f5ef] text-black shadow-[0_0_24px_rgba(245,245,240,0.18)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                activeMode === "register"
                  ? "bg-[#f7f5ef] text-black shadow-[0_0_24px_rgba(245,245,240,0.18)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Register
            </Link>
          </div>

          <div className="mb-7">
            <p className="text-sm font-semibold text-zinc-300">{eyebrow}</p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-[#f7f5ef] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
          </div>

          {children}

          {footer && (
            <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-zinc-400">
              {footer}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}

export default AuthLayout;
