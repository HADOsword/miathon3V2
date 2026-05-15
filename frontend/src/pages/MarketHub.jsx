import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowRight,
    FileText,
    Loader2,
    Sparkles,
    Target,
    Upload,
} from "lucide-react";
import { getApiErrorMessage, isUnauthorizedError } from "../api/client";
import { getResumes } from "../api/resumeApi";
import AmbientBackground from "../components/landing/AmbientBackground";
import AppNavbar from "../components/AppNavbar";

const panelClass =
    "overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#101010]/90 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl";
const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300/45 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const primaryButton =
    `${buttonBase} bg-amber-300 px-4 text-zinc-950 shadow-[0_16px_42px_rgba(245,158,11,0.16)] hover:bg-amber-200`;
const subtleButton =
    `${buttonBase} border border-white/10 bg-white/[0.045] px-4 text-zinc-200 hover:border-white/25 hover:bg-white/[0.08]`;

const getResumeName = (resume) =>
    resume?.title || resume?.originalFileName || "Untitled resume";

const formatDate = (value) => {
    if (!value) return "No date";
    return new Date(value).toLocaleDateString();
};

function MarketHub() {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const handleRequestError = useCallback((err, fallback) => {
        if (isUnauthorizedError(err)) {
            navigate("/login", { replace: true });
            return "Your session expired. Please sign in again.";
        }

        return getApiErrorMessage(err, fallback);
    }, [navigate]);

    useEffect(() => {
        let isMounted = true;

        const loadResumes = async () => {
            try {
                const data = await getResumes();

                if (!isMounted) return;
                setResumes(data.resumes || []);
            } catch (err) {
                if (!isMounted) return;
                setError(handleRequestError(err, "Could not load your saved CVs."));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadResumes();

        return () => {
            isMounted = false;
        };
    }, [handleRequestError]);

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-zinc-100">
            <AmbientBackground />
            <AppNavbar />

            <main className="relative z-10 mx-auto max-w-[92rem] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
                <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(16,16,16,0.98),rgba(10,10,10,0.82))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-8"
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/55 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(245,158,11,0.08),transparent_32%,rgba(161,161,170,0.06))]" />
                    <div className="relative">
                        <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">
                            <Target size={14} />
                            Market Match
                        </p>
                        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h1 className="text-3xl font-semibold text-zinc-50 sm:text-5xl">
                                    Choose a CV to compare
                                </h1>
                                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                                    The market page is linked to each CV, so every resume keeps its own job offers, matching score, gaps, and roadmap.
                                </p>
                            </div>
                            <Link to="/upload-cv" className={`${primaryButton} h-11 w-fit`}>
                                <Upload size={16} />
                                Upload CV
                            </Link>
                        </div>
                    </div>
                </motion.section>

                {error && (
                    <div className="mt-6 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="mt-12 flex items-center justify-center gap-3 text-zinc-400">
                        <Loader2 size={18} className="animate-spin" />
                        Loading saved CVs...
                    </div>
                ) : resumes.length === 0 ? (
                    <section className={`${panelClass} mt-8 p-10 text-center`}>
                        <FileText size={38} className="mx-auto text-zinc-500" />
                        <h2 className="mt-4 text-xl font-semibold text-zinc-100">
                            No CVs ready for market comparison
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                            Upload a CV first, then open Market Match to generate its job recommendations and roadmap.
                        </p>
                        <Link to="/upload-cv" className={`${primaryButton} mt-6 h-11`}>
                            <Upload size={16} />
                            Upload CV
                        </Link>
                    </section>
                ) : (
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.08 }}
                        className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                    >
                        {resumes.map((resume, index) => (
                            <motion.article
                                key={resume._id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.28, delay: index * 0.035 }}
                                whileHover={{ y: -3 }}
                                className={`${panelClass} p-5`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-amber-100">
                                        <FileText size={18} />
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-semibold text-zinc-50">
                                            {getResumeName(resume)}
                                        </h2>
                                        <p className="mt-1 truncate text-sm text-zinc-500">
                                            {resume.originalFileName || formatDate(resume.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
                                        <Sparkles size={14} />
                                        Final comparison
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                                        Open this CV’s market page to view saved results or refresh job-market data.
                                    </p>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <Link
                                        to={`/resumes/${resume._id}/market`}
                                        className={`${primaryButton} h-10 flex-1 px-3`}
                                    >
                                        <Target size={15} />
                                        Open Market
                                        <ArrowRight size={15} />
                                    </Link>
                                    <Link to="/resumes" className={`${subtleButton} h-10 px-3`}>
                                        Edit CV
                                    </Link>
                                </div>
                            </motion.article>
                        ))}
                    </motion.section>
                )}
            </main>
        </div>
    );
}

export default MarketHub;
