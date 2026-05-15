import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle,
    FileText,
    FolderKanban,
    GraduationCap,
    Loader2,
    MessageSquareText,
    Pause,
    Play,
    RefreshCcw,
    Sparkles,
    Upload,
    UserRound,
    Wrench,
} from "lucide-react";
import AmbientBackground from "../components/landing/AmbientBackground";
import AppNavbar from "../components/AppNavbar";
import { getApiErrorMessage, isUnauthorizedError } from "../api/client";
import {
    generateInterviewQuestions,
    getResume,
    getResumes,
} from "../api/resumeApi";

const panelClass =
    "overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#101010]/90 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl";
const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300/45 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const primaryButton =
    `${buttonBase} bg-amber-300 px-4 text-zinc-950 shadow-[0_16px_42px_rgba(245,158,11,0.16)] hover:bg-amber-200`;
const subtleButton =
    `${buttonBase} border border-white/10 bg-white/[0.045] px-4 text-zinc-200 hover:border-white/25 hover:bg-white/[0.08]`;

const emptyQuestions = {
    candidateProfile: "",
    interviewFocus: "",
    technical_questions: [],
    behavioral_questions: [],
    experience_questions: [],
    project_questions: [],
    education_questions: [],
};

const questionGroups = [
    {
        key: "technical_questions",
        title: "Technical",
        icon: Wrench,
        empty: "No technical questions generated yet.",
    },
    {
        key: "behavioral_questions",
        title: "Behavioral",
        icon: UserRound,
        empty: "No behavioral questions generated yet.",
    },
    {
        key: "experience_questions",
        title: "Experience",
        icon: BriefcaseBusiness,
        empty: "No experience questions generated yet.",
    },
    {
        key: "project_questions",
        title: "Projects",
        icon: FolderKanban,
        empty: "No project questions generated yet.",
    },
    {
        key: "education_questions",
        title: "Education",
        icon: GraduationCap,
        empty: "No education questions generated yet.",
    },
];

const isPlainObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value);

const toText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
};

const formatDate = (value) => {
    if (!value) return "No date";
    return new Date(value).toLocaleDateString();
};

const getResumeName = (resume) =>
    resume?.title || resume?.originalFileName || "Untitled CV";

const normalizeQuestion = (item) => {
    if (typeof item === "string") {
        return {
            question: item.trim(),
            focus: "",
            reason: "",
        };
    }

    if (!isPlainObject(item)) {
        return null;
    }

    const question = toText(item.question || item.prompt).trim();

    if (!question) {
        return null;
    }

    return {
        question,
        focus: toText(
            item.focus ||
                item.skill_or_topic ||
                item.competency ||
                item.role_or_experience ||
                item.project ||
                item.topic ||
                item.skill ||
                item.technology ||
                item.degree ||
                ""
        ),
        reason: toText(item.reason || item.why || ""),
    };
};

const normalizeQuestionList = (value) =>
    (Array.isArray(value) ? value : [])
        .map(normalizeQuestion)
        .filter(Boolean);

const normalizeInterviewQuestions = (analysisOrQuestions) => {
    const source = isPlainObject(analysisOrQuestions?.interview_questions)
        ? analysisOrQuestions.interview_questions
        : isPlainObject(analysisOrQuestions?.interviewQuestions)
          ? analysisOrQuestions.interviewQuestions
          : isPlainObject(analysisOrQuestions)
            ? analysisOrQuestions
            : {};

    return {
        ...emptyQuestions,
        candidateProfile: toText(source.candidate_profile || source.candidateProfile),
        interviewFocus: toText(source.interview_focus || source.interviewFocus),
        technical_questions: normalizeQuestionList(
            source.technical_questions || source.technicalQuestions
        ),
        behavioral_questions: normalizeQuestionList(
            source.behavioral_questions || source.behavioralQuestions
        ),
        experience_questions: normalizeQuestionList(
            source.experience_questions || source.experienceQuestions
        ),
        project_questions: normalizeQuestionList(
            source.project_questions || source.projectQuestions
        ),
        education_questions: normalizeQuestionList(
            source.education_questions || source.educationQuestions
        ),
    };
};

const countQuestions = (questions) =>
    questionGroups.reduce((total, group) => total + questions[group.key].length, 0);

const flattenQuestions = (questions) =>
    questionGroups.flatMap((group) =>
        questions[group.key].map((item, index) => ({
            ...item,
            groupKey: group.key,
            groupTitle: group.title,
            groupIcon: group.icon,
            itemNumber: index + 1,
        }))
    );

function QuestionPlayer({
    questions,
    activeIndex,
    isAutoPlaying,
    onSelect,
    onPrevious,
    onNext,
    onToggleAutoPlay,
}) {
    if (questions.length === 0) {
        return (
            <div className={`${panelClass} flex min-h-[28rem] items-center justify-center p-8 text-center`}>
                <div>
                    <MessageSquareText size={42} className="mx-auto text-zinc-500" />
                    <h2 className="mt-4 text-xl font-semibold text-zinc-100">
                        No questions generated yet
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                        Click Generate Questions to create a focused interview flow for this CV.
                    </p>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[activeIndex] || questions[0];
    const Icon = currentQuestion.groupIcon;
    const progress = ((activeIndex + 1) / questions.length) * 100;

    return (
        <section className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500">Question player</p>
                    <h3 className="mt-2 text-2xl font-semibold text-zinc-50">
                        One question at a time
                    </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {questionGroups.map((group) => {
                        const startIndex = questions.findIndex((item) => item.groupKey === group.key);
                        const count = questions.filter((item) => item.groupKey === group.key).length;
                        const isActive = currentQuestion.groupKey === group.key;
                        const GroupIcon = group.icon;

                        if (startIndex < 0) {
                            return null;
                        }

                        return (
                            <button
                                key={group.key}
                                type="button"
                                onClick={() => onSelect(startIndex)}
                                className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                                    isActive
                                        ? "border-amber-300/40 bg-amber-300/[0.12] text-amber-100"
                                        : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-white/25 hover:bg-white/[0.07] hover:text-zinc-100"
                                }`}
                            >
                                <GroupIcon size={14} />
                                {group.title}
                                <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[0.68rem]">
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0a0a0a]/70">
                <div className="h-1.5 bg-white/[0.07]">
                    <motion.div
                        className="h-full rounded-full bg-amber-300"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                </div>

                <div className="relative min-h-[24rem] p-5 sm:p-8">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.article
                            key={`${currentQuestion.groupKey}-${activeIndex}-${currentQuestion.question}`}
                            initial={{ opacity: 0, x: 56, scale: 0.98, filter: "blur(6px)" }}
                            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, x: -56, scale: 0.98, filter: "blur(6px)" }}
                            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                            className="flex min-h-[21rem] flex-col justify-between"
                        >
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">
                                        <Icon size={15} />
                                        {currentQuestion.groupTitle}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-zinc-300">
                                        {activeIndex + 1} / {questions.length}
                                    </span>
                                </div>

                                <h2 className="mt-8 max-w-4xl text-2xl font-semibold leading-snug text-[#f7f5ef] sm:text-3xl">
                                    {currentQuestion.question}
                                </h2>

                                <div className="mt-8 grid gap-3 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                                        <p className="text-xs font-semibold uppercase text-zinc-500">Focus</p>
                                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                                            {currentQuestion.focus || "Candidate-specific discussion"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                                        <p className="text-xs font-semibold uppercase text-zinc-500">Why ask</p>
                                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                                            {currentQuestion.reason || "Helps validate the CV with a practical answer."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.article>
                    </AnimatePresence>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center justify-center gap-2">
                    {questions.map((item, index) => (
                        <button
                            key={`${item.groupKey}-${index}`}
                            type="button"
                            aria-label={`Show question ${index + 1}`}
                            onClick={() => onSelect(index)}
                            className={`h-2.5 rounded-full transition-all ${
                                index === activeIndex
                                    ? "w-8 bg-amber-300"
                                    : "w-2.5 bg-white/20 hover:bg-white/40"
                            }`}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={onPrevious}
                        className={`${subtleButton} h-11`}
                    >
                        <ArrowLeft size={16} />
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={onToggleAutoPlay}
                        className={`${subtleButton} h-11`}
                    >
                        {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
                        {isAutoPlaying ? "Pause" : "Auto play"}
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        className={`${primaryButton} h-11`}
                    >
                        Next
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </section>
    );
}

function InterviewQuestions() {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [selectedResume, setSelectedResume] = useState(null);
    const [questions, setQuestions] = useState(emptyQuestions);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingResumeId, setLoadingResumeId] = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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
                setError(handleRequestError(err, "Could not load saved CVs."));
            } finally {
                if (isMounted) {
                    setLoadingList(false);
                }
            }
        };

        loadResumes();

        return () => {
            isMounted = false;
        };
    }, [handleRequestError]);

    const flattenedQuestions = useMemo(() => flattenQuestions(questions), [questions]);

    const handleSelectResume = async (resume) => {
        setLoadingResumeId(resume._id);
        setError("");
        setSuccess("");
        setIsAutoPlaying(false);

        try {
            const data = await getResume(resume._id);
            const nextResume = data.resume;

            setSelectedResume(nextResume);
            setQuestions(normalizeInterviewQuestions(nextResume.analysis));
            setActiveQuestionIndex(0);
        } catch (err) {
            setError(handleRequestError(err, "Could not open this CV."));
        } finally {
            setLoadingResumeId("");
        }
    };

    const handleGenerateQuestions = async () => {
        if (!selectedResume?._id) return;

        setGenerating(true);
        setError("");
        setSuccess("");

        try {
            const data = await generateInterviewQuestions(selectedResume._id);
            const nextQuestions = normalizeInterviewQuestions(data.interviewQuestions);

            setSelectedResume(data.resume);
            setQuestions(nextQuestions);
            setActiveQuestionIndex(0);
            setIsAutoPlaying(countQuestions(nextQuestions) > 1);
            setSuccess("Interview questions generated and saved for this CV.");
        } catch (err) {
            setError(handleRequestError(err, "Could not generate interview questions."));
        } finally {
            setGenerating(false);
        }
    };

    const showPreviousQuestion = () => {
        if (flattenedQuestions.length === 0) return;
        setActiveQuestionIndex((current) =>
            current === 0 ? flattenedQuestions.length - 1 : current - 1
        );
    };

    const showNextQuestion = useCallback(() => {
        if (flattenedQuestions.length === 0) return;
        setActiveQuestionIndex((current) => (current + 1) % flattenedQuestions.length);
    }, [flattenedQuestions.length]);

    useEffect(() => {
        if (activeQuestionIndex >= flattenedQuestions.length && flattenedQuestions.length > 0) {
            setActiveQuestionIndex(0);
        }
    }, [activeQuestionIndex, flattenedQuestions.length]);

    useEffect(() => {
        if (!isAutoPlaying || flattenedQuestions.length <= 1) {
            return undefined;
        }

        const timer = window.setInterval(showNextQuestion, 6200);
        return () => window.clearInterval(timer);
    }, [flattenedQuestions.length, isAutoPlaying, showNextQuestion]);

    const totalQuestions = countQuestions(questions);
    const selectedProfile =
        selectedResume?.analysis?.main_profile ||
        selectedResume?.analysis?.mainProfile ||
        questions.candidateProfile ||
        "-";

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
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">
                                <MessageSquareText size={14} />
                                Interview Questions
                            </p>
                            <h1 className="mt-5 text-3xl font-semibold text-zinc-50 sm:text-5xl">
                                Choose a CV, then generate questions
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                                Build recruiter-ready technical, behavioral, project, experience, and education questions from the saved CV analysis.
                            </p>
                        </div>
                        <Link to="/upload-cv" className={`${subtleButton} h-11 w-fit`}>
                            <Upload size={16} />
                            Upload CV
                        </Link>
                    </div>
                </motion.section>

                {error && (
                    <div className="mt-6 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mt-6 flex gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
                        <CheckCircle size={18} className="mt-0.5 shrink-0" />
                        <p>{success}</p>
                    </div>
                )}

                <div className="mt-8 space-y-6">
                    <section className={`${panelClass} p-4 sm:p-5`}>
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase text-zinc-500">Saved CVs</p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Pick one CV, then generate or replay its interview questions below.
                                </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-zinc-300">
                                {resumes.length}
                            </span>
                        </div>

                        {loadingList ? (
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
                                <Loader2 size={17} className="animate-spin" />
                                Loading CVs...
                            </div>
                        ) : resumes.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center">
                                <FileText size={32} className="mx-auto text-zinc-500" />
                                <p className="mt-3 text-sm font-semibold text-zinc-100">No CVs saved yet</p>
                                <Link to="/upload-cv" className={`${primaryButton} mt-4 h-10`}>
                                    <Upload size={15} />
                                    Upload CV
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                {resumes.map((resume, index) => {
                                    const isSelected = selectedResume?._id === resume._id;
                                    const isLoading = loadingResumeId === resume._id;

                                    return (
                                        <motion.button
                                            key={resume._id}
                                            type="button"
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25, delay: index * 0.03 }}
                                            onClick={() => handleSelectResume(resume)}
                                            className={`w-full rounded-2xl border p-4 text-left transition duration-200 ${
                                                isSelected
                                                    ? "border-amber-300/45 bg-amber-300/[0.08]"
                                                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-amber-100">
                                                    {isLoading ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <FileText size={17} />
                                                    )}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-zinc-100">
                                                        {getResumeName(resume)}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-zinc-500">
                                                        {resume.originalFileName || formatDate(resume.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="min-w-0 space-y-5">
                        {!selectedResume ? (
                            <div className={`${panelClass} flex min-h-[26rem] items-center justify-center p-8 text-center`}>
                                <div>
                                    <MessageSquareText size={42} className="mx-auto text-zinc-500" />
                                    <h2 className="mt-4 text-xl font-semibold text-zinc-100">
                                        Select a CV first
                                    </h2>
                                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                                        Pick one saved CV from the left, then click Generate Questions to create the recruiter interview guide.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={`${panelClass} p-5 sm:p-6`}>
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase text-zinc-500">
                                                Selected CV
                                            </p>
                                            <h2 className="mt-2 truncate text-2xl font-semibold text-zinc-50">
                                                {getResumeName(selectedResume)}
                                            </h2>
                                            <p className="mt-2 text-sm text-zinc-400">
                                                Profile: {selectedProfile}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGenerateQuestions}
                                            disabled={generating}
                                            className={`${primaryButton} h-11`}
                                        >
                                            {generating ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : totalQuestions > 0 ? (
                                                <RefreshCcw size={16} />
                                            ) : (
                                                <Sparkles size={16} />
                                            )}
                                            {totalQuestions > 0 ? "Regenerate Questions" : "Generate Questions"}
                                        </button>
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                                            <p className="text-xs font-semibold uppercase text-zinc-500">Questions</p>
                                            <p className="mt-2 text-2xl font-semibold text-amber-100">{totalQuestions}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:col-span-2">
                                            <p className="text-xs font-semibold uppercase text-zinc-500">Interview focus</p>
                                            <p className="mt-2 text-sm leading-6 text-zinc-300">
                                                {questions.interviewFocus || "Generate questions to create the interview focus."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <QuestionPlayer
                                    questions={flattenedQuestions}
                                    activeIndex={activeQuestionIndex}
                                    isAutoPlaying={isAutoPlaying}
                                    onSelect={(index) => {
                                        setActiveQuestionIndex(index);
                                        setIsAutoPlaying(false);
                                    }}
                                    onPrevious={() => {
                                        showPreviousQuestion();
                                        setIsAutoPlaying(false);
                                    }}
                                    onNext={() => {
                                        showNextQuestion();
                                        setIsAutoPlaying(false);
                                    }}
                                    onToggleAutoPlay={() =>
                                        setIsAutoPlaying((current) => !current)
                                    }
                                />
                            </>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

export default InterviewQuestions;
