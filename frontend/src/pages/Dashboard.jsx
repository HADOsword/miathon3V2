import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { clearAuthToken, getApiErrorMessage, isUnauthorizedError } from "../api/client";
import { getDashboard } from "../api/authApi";
import AmbientBackground from "../components/landing/AmbientBackground";
import AppNavbar from "../components/AppNavbar";
import { ArrowRight, CheckCircle, FileText, Sparkles, Target, Upload } from "lucide-react";

const actionCards = [
    {
        to: "/upload-cv",
        title: "Upload Your CV",
        description: "Start with a PDF or DOCX and let the app extract a clean, editable profile.",
        cta: "Start extraction",
        icon: Upload,
        accent: "via-amber-400/65",
    },
    {
        to: "/resumes",
        title: "Manage Stored Data",
        description: "Review the saved extraction, adjust details, and keep each CV profile accurate.",
        cta: "Open CV data",
        icon: FileText,
        accent: "via-white/45",
    },
    {
        to: "/market",
        title: "Market Match",
        description: "Compare a CV with job offers, see skill gaps, and build a learning roadmap.",
        cta: "Compare skills",
        icon: Target,
        accent: "via-amber-400/50",
    },
];

const workflowSteps = [
    "Upload or choose a CV",
    "Check extracted profile data",
    "Compare with market offers",
    "Create a personal roadmap",
];

function DashboardActionCard({ item, index }) {
    const Icon = item.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 + index * 0.08 }}
        >
            <Link
                to={item.to}
                className="group relative flex h-full min-h-[17rem] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.035] p-6 backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-amber-400/40 hover:bg-white/[0.06] hover:shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            >
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${item.accent} to-transparent`} />
                <div className="mb-5 flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.07] text-zinc-100 transition group-hover:border-amber-400/40 group-hover:bg-amber-500/10">
                        <Icon size={22} />
                    </span>
                    <ArrowRight size={18} className="mt-3 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-amber-300" />
                </div>
                <h3 className="text-xl font-semibold text-[#f7f5ef]">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">{item.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-400">
                    {item.cta}
                    <Sparkles size={14} />
                </div>
            </Link>
        </motion.div>
    );
}

function Dashboard() {
    const navigate = useNavigate();

    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;
        let redirectTimer;

        const loadDashboard = async () => {
            try {
                await getDashboard();
            } catch (err) {
                if (!isMounted) {
                    return;
                }

                setError(getApiErrorMessage(err, "Could not verify your dashboard session."));

                if (isUnauthorizedError(err)) {
                    clearAuthToken();

                    redirectTimer = window.setTimeout(() => {
                        navigate("/login", { replace: true });
                    }, 1000);
                }
            }
        };

        loadDashboard();

        return () => {
            isMounted = false;

            if (redirectTimer) {
                window.clearTimeout(redirectTimer);
            }
        };
    }, [navigate]);

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-[#f7f5ef]">
            <AmbientBackground />
            <AppNavbar />

            <main className="relative z-10 mx-auto max-w-[92rem] px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(16,16,16,0.98),rgba(10,10,10,0.82))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-8 lg:flex lg:items-end lg:justify-between lg:gap-8"
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(245,158,11,0.08),transparent_32%,rgba(247,245,239,0.035))]" />
                    <div className="relative max-w-3xl">
                        <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">
                            <Sparkles size={14} />
                            Workspace
                        </p>
                        <h1 className="mt-5 text-3xl font-semibold text-[#f7f5ef] sm:text-5xl">
                            Welcome back
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                            Move from CV upload to market matching without losing context. Each CV keeps its extracted data, offers, gaps, and roadmap together.
                        </p>
                    </div>
                    <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:w-[26rem]">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                            <p className="text-xs font-semibold uppercase text-zinc-500">Best next step</p>
                            <p className="mt-2 text-sm font-semibold text-[#f7f5ef]">Choose a workflow below</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                            <p className="text-xs font-semibold uppercase text-zinc-500">Private data</p>
                            <p className="mt-2 text-sm font-semibold text-[#f7f5ef]">Linked to your account</p>
                        </div>
                    </div>
                </motion.section>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200"
                    >
                        {error}
                    </motion.div>
                )}

                <div className="mt-8 space-y-5">
                    <div className="grid gap-5 md:grid-cols-3">
                        {actionCards.map((item, index) => (
                            <DashboardActionCard key={item.title} item={item} index={index} />
                        ))}
                    </div>

                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.34 }}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl"
                    >
                        <p className="text-xs font-semibold uppercase text-zinc-500">Recommended flow</p>
                        <div className="mt-5 grid gap-4 md:grid-cols-4">
                            {workflowSteps.map((step, index) => (
                                <div key={step} className="flex gap-3">
                                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/[0.08] text-amber-200">
                                        <CheckCircle size={14} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-100">{step}</p>
                                        <p className="mt-1 text-xs text-zinc-500">Step {index + 1}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.section>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
