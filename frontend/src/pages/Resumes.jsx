import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    BriefcaseBusiness,
    CheckCircle,
    Eye,
    FileText,
    FolderKanban,
    GraduationCap,
    Loader2,
    Plus,
    Target,
    Save,
    Trash2,
    Upload,
    UserRound,
    Wrench,
    X,
} from "lucide-react";
import AmbientBackground from "../components/landing/AmbientBackground";
import AppNavbar from "../components/AppNavbar";
import { getApiErrorMessage, isUnauthorizedError } from "../api/client";
import {
    deleteResume,
    getResume,
    getResumes,
    updateResume,
} from "../api/resumeApi";

const emptyPersonalInfo = {
    name: "",
    email: "",
    phone: "",
    location: "",
};

const emptyEducation = () => ({
    degree: "",
    institution: "",
    location: "",
    year: "",
});

const emptyExperience = () => ({
    title: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
});

const emptyProject = () => ({
    name: "",
    description: "",
    technologiesText: "",
});

const isPlainObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value);

const formatDate = (value) => {
    if (!value) return "No date";
    return new Date(value).toLocaleDateString();
};

const getResumeName = (resume) =>
    resume?.title || resume?.originalFileName || "Untitled resume";

const getAnalysis = (resume) => (isPlainObject(resume?.analysis) ? resume.analysis : {});

const toText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value, null, 2);
};

const toListText = (items = []) => {
    if (Array.isArray(items)) {
        return items.map(toText).filter(Boolean).join("\n");
    }

    if (isPlainObject(items)) {
        return Object.entries(items)
            .map(([key, value]) => {
                const text = Array.isArray(value) ? value.map(toText).join(", ") : toText(value);
                return text ? `${key}: ${text}` : key;
            })
            .filter(Boolean)
            .join("\n");
    }

    return toText(items);
};

const firstListText = (...values) => {
    for (const value of values) {
        const text = toListText(value).trim();

        if (text) {
            return text;
        }
    }

    return "";
};

const extractSectionText = (text, labels, stopLabels) => {
    const source = String(text || "").replace(/\s+/g, " ").trim();

    for (const label of labels) {
        const regex = new RegExp(
            `(?:^|\\s)${label}\\s*:?\\s*(.*?)(?=\\s(?:${stopLabels.join("|")})\\s*:?\\s|$)`,
            "i"
        );
        const match = source.match(regex);

        if (match?.[1]?.trim()) {
            return match[1].trim();
        }
    }

    return "";
};

const extractLanguagesFromText = (text) => {
    const section = extractSectionText(text, ["langues", "languages"], [
        "comp[eé]tences",
        "skills",
        "certifications?",
        "formation",
        "[eé]ducation",
        "exp[eé]riences?",
        "experience",
        "projets?",
        "projects?",
        "profil",
        "summary",
        "loisirs",
        "centres? d.int[eé]r[eê]t",
    ]);

    if (!section) {
        return "";
    }

    const knownLanguages = [
        "Anglais",
        "Français",
        "Francais",
        "Arabe",
        "Espagnol",
        "Allemand",
        "Italien",
        "Portugais",
        "Chinois",
        "Japonais",
        "Russe",
        "Néerlandais",
        "Neerlandais",
        "Turc",
    ];
    const found = knownLanguages.filter((language) =>
        new RegExp(`\\b${language}\\b`, "i").test(section)
    );

    if (found.length > 0) {
        return [...new Set(found)].join("\n");
    }

    return section
        .split(/[,;|•\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join("\n");
};

const fromListText = (value) =>
    String(value || "")
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);

const hasValue = (item) =>
    Object.values(item).some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return String(value || "").trim().length > 0;
    });

const normalizeArray = (items, fallback, mapItem = (item) => item) => {
    const source = Array.isArray(items) ? items : items ? [items] : [];
    const normalized = source.map(mapItem);
    return normalized.length > 0 ? normalized : [fallback()];
};

const normalizeEducation = (item) => {
    if (!isPlainObject(item)) {
        return { ...emptyEducation(), degree: toText(item) };
    }

    return {
        degree: toText(item.degree || item.qualification || item.program || item.field || ""),
        institution: toText(item.institution || item.school || item.university || ""),
        location: toText(item.location || ""),
        year: toText(
            item.year ||
                item.graduation_year ||
                item.period ||
                item.dates ||
                item.end_date ||
                item.endDate ||
                ""
        ),
    };
};

const normalizeExperience = (item) => {
    if (!isPlainObject(item)) {
        return { ...emptyExperience(), description: toText(item) };
    }

    return {
        title: toText(item.job_title || item.title || item.role || item.position || ""),
        company: toText(item.company || item.organization || item.employer || ""),
        location: toText(item.location || ""),
        startDate: toText(item.startDate || item.start_date || item.start || ""),
        endDate: toText(item.endDate || item.end_date || item.end || ""),
        description: toListText(
            item.description || item.responsibilities || item.achievements || ""
        ),
    };
};

const normalizeProject = (item) => {
    if (!isPlainObject(item)) {
        return { ...emptyProject(), description: toText(item) };
    }

    return {
        name: toText(item.name || item.title || ""),
        description: toText(item.description || ""),
        technologiesText: toListText(item.technologies || item.tools || item.tech_stack),
    };
};

const parseTechnicalSkills = (value) => {
    const lines = String(value || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    const grouped = {};
    const other = [];

    lines.forEach((line) => {
        const separatorIndex = line.indexOf(":");

        if (separatorIndex > 0) {
            const key = line.slice(0, separatorIndex).trim();
            const skills = line
                .slice(separatorIndex + 1)
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            grouped[key] = skills.length > 1 ? skills : skills[0] || "";
            return;
        }

        other.push(line);
    });

    if (other.length > 0) {
        grouped.other = other;
    }

    return grouped;
};

const resumeToForm = (resume) => {
    const analysis = getAnalysis(resume);
    const personalInfo = isPlainObject(analysis.personalInfo) ? analysis.personalInfo : {};

    return {
        title: resume?.title || "",
        notes: resume?.notes || "",
        tagsText: toListText(resume?.tags),
        personalInfo: {
            ...emptyPersonalInfo,
            name: toText(analysis.full_name || analysis.name || personalInfo.name || ""),
            email: toText(analysis.email || personalInfo.email || ""),
            phone: toText(analysis.phone || personalInfo.phone || ""),
            location: toText(analysis.location || personalInfo.location || ""),
        },
        summary: toText(analysis.professional_summary || analysis.summary || ""),
        mainProfile: toText(analysis.main_profile || ""),
        seniorityLevel: toText(analysis.seniority_level || ""),
        yearsOfExperience: toText(analysis.years_of_experience ?? ""),
        skillsText: firstListText(analysis.technical_skills, analysis.skills),
        softSkillsText: firstListText(analysis.soft_skills),
        languagesText: firstListText(
            analysis.languages,
            analysis.langues,
            analysis.spoken_languages,
            analysis.spokenLanguages,
            personalInfo.languages,
            extractLanguagesFromText(resume?.extractedText)
        ),
        certificationsText: firstListText(analysis.certifications),
        education: normalizeArray(analysis.education, emptyEducation, normalizeEducation),
        experience: normalizeArray(
            analysis.work_experience || analysis.experience,
            emptyExperience,
            normalizeExperience
        ),
        projects: normalizeArray(analysis.projects, emptyProject, normalizeProject),
    };
};

const buildPayload = (form, existingAnalysis) => {
    const title = form.title.trim();

    if (!title) {
        return { error: "Title is required." };
    }

    const yearsText = form.yearsOfExperience.trim();
    const yearsValue = Number(yearsText);
    const analysis = {
        ...existingAnalysis,
        full_name: form.personalInfo.name.trim(),
        email: form.personalInfo.email.trim(),
        phone: form.personalInfo.phone.trim(),
        professional_summary: form.summary.trim(),
        main_profile: form.mainProfile.trim(),
        seniority_level: form.seniorityLevel.trim(),
        years_of_experience:
            yearsText && Number.isFinite(yearsValue) ? yearsValue : yearsText,
        education: form.education.filter(hasValue),
        work_experience: form.experience
            .filter(hasValue)
            .map((item) => ({
                title: item.title,
                company: item.company,
                location: item.location,
                start_date: item.startDate,
                end_date: item.endDate,
                description: item.description,
            })),
        technical_skills: parseTechnicalSkills(form.skillsText),
        soft_skills: fromListText(form.softSkillsText),
        languages: fromListText(form.languagesText),
        certifications: fromListText(form.certificationsText),
        projects: form.projects
            .map((project) => ({
                name: project.name,
                description: project.description,
                technologies: fromListText(project.technologiesText),
            }))
            .filter(hasValue),
    };

    if (form.personalInfo.location.trim()) {
        analysis.location = form.personalInfo.location.trim();
    } else {
        delete analysis.location;
    }

    return {
        payload: {
            title,
            notes: form.notes,
            tags: fromListText(form.tagsText),
            analysis,
        },
    };
};

const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300/45 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const primaryButton =
    `${buttonBase} bg-amber-300 px-4 text-zinc-950 shadow-[0_16px_42px_rgba(245,158,11,0.16)] hover:bg-amber-200`;
const lightButton =
    `${buttonBase} bg-zinc-100 px-4 text-zinc-950 shadow-[0_16px_42px_rgba(247,245,239,0.12)] hover:bg-white`;
const subtleButton =
    `${buttonBase} border border-white/10 bg-white/[0.045] px-4 text-zinc-200 hover:border-white/25 hover:bg-white/[0.08]`;
const dangerIconButton =
    `${buttonBase} h-10 w-10 border border-amber-400/25 bg-amber-500/10 p-0 text-amber-200 hover:border-amber-300/50 hover:bg-amber-500/15`;
const panelClass =
    "overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#101010]/90 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl";
const fieldClass =
    "mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#0a0a0a]/80 px-3.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-white/18 focus:border-amber-300/60 focus:bg-[#111111] focus:ring-2 focus:ring-amber-300/15";
const textAreaClass =
    "mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#0a0a0a]/80 px-3.5 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-white/18 focus:border-amber-300/60 focus:bg-[#111111] focus:ring-2 focus:ring-amber-300/15";
const itemCardClass =
    "rounded-2xl border border-white/10 bg-[#0a0a0a]/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition duration-200 hover:border-white/20 hover:bg-white/[0.045]";
const tabViewportClass =
    "min-h-[18rem] lg:max-h-[calc(100vh-21rem)] lg:overflow-y-auto lg:pr-2";

const editorTabs = [
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "skills", label: "Skills", icon: Wrench },
    { id: "experience", label: "Experience", icon: BriefcaseBusiness },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "projects", label: "Projects", icon: FolderKanban },
];

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
};

const tabMotion = {
    initial: { opacity: 0, y: 10, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -8, filter: "blur(4px)" },
};

function TextInput({ label, value, onChange, placeholder = "" }) {
    return (
        <label className="block">
            <span className="text-xs font-semibold uppercase text-zinc-500">{label}</span>
            <input
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className={fieldClass}
            />
        </label>
    );
}

function TextArea({ label, value, onChange, rows = 4, placeholder = "" }) {
    return (
        <label className="block">
            <span className="text-xs font-semibold uppercase text-zinc-500">{label}</span>
            <textarea
                value={value}
                rows={rows}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className={textAreaClass}
            />
        </label>
    );
}

function Section({ title, action, children }) {
    return (
        <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="rounded-[1.15rem] border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-6"
        >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                {action}
            </div>
            {children}
        </motion.section>
    );
}

function Resumes() {
    const navigate = useNavigate();

    const [resumes, setResumes] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(null);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState("");
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [activeEditorTab, setActiveEditorTab] = useState("profile");
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
                setError(handleRequestError(err, "Could not load stored extractions."));
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

    const openEditor = async (id) => {
        setLoadingDetail(id);
        setError("");
        setSuccess("");

        try {
            const data = await getResume(id);
            setSelected(data.resume);
            setForm(resumeToForm(data.resume));
            setActiveEditorTab("profile");
        } catch (err) {
            setError(handleRequestError(err, "Could not open extracted data."));
        } finally {
            setLoadingDetail("");
        }
    };

    const closeEditor = () => {
        setSelected(null);
        setForm(null);
        setActiveEditorTab("profile");
        setError("");
        setSuccess("");
    };

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const updatePersonalInfo = (field, value) => {
        setForm((current) => ({
            ...current,
            personalInfo: {
                ...current.personalInfo,
                [field]: value,
            },
        }));
    };

    const updateArrayItem = (section, index, field, value) => {
        setForm((current) => ({
            ...current,
            [section]: current[section].map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
            ),
        }));
    };

    const addArrayItem = (section, factory) => {
        setForm((current) => ({
            ...current,
            [section]: [...current[section], factory()],
        }));
    };

    const removeArrayItem = (section, index, factory) => {
        setForm((current) => {
            const nextItems = current[section].filter((_, itemIndex) => itemIndex !== index);
            return {
                ...current,
                [section]: nextItems.length > 0 ? nextItems : [factory()],
            };
        });
    };

    const updateMetadataAfterSave = (resume) => {
        setResumes((current) =>
            current.map((item) =>
                item._id === resume._id
                    ? {
                          ...item,
                          title: resume.title,
                          originalFileName: resume.originalFileName,
                          notes: resume.notes,
                          tags: resume.tags,
                          updatedAt: resume.updatedAt,
                      }
                    : item
            )
        );
        setSelected(resume);
        setForm(resumeToForm(resume));
    };

    const handleSave = async () => {
        if (!selected || !form) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const { payload, error: payloadError } = buildPayload(form, getAnalysis(selected));

            if (payloadError) {
                setError(payloadError);
                return;
            }

            const data = await updateResume(selected._id, payload);
            updateMetadataAfterSave(data.resume);
            setSuccess("Extracted data updated successfully.");
        } catch (err) {
            setError(handleRequestError(err, "Could not update extracted data."));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (resume) => {
        const confirmed = window.confirm(
            `Delete "${getResumeName(resume)}" and its linked CV file?`
        );

        if (!confirmed) return;

        setDeletingId(resume._id);
        setError("");
        setSuccess("");

        try {
            await deleteResume(resume._id);
            setResumes((current) => current.filter((item) => item._id !== resume._id));

            if (selected?._id === resume._id) {
                setSelected(null);
                setForm(null);
            }

            setSuccess("Extracted data deleted successfully.");
        } catch (err) {
            setError(handleRequestError(err, "Could not delete extracted data."));
        } finally {
            setDeletingId("");
        }
    };

    const selectedProfile = form?.mainProfile?.trim() || "No profile selected";
    const selectedSkillCount = form
        ? fromListText(form.skillsText).length + fromListText(form.softSkillsText).length
        : 0;

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-zinc-100">
            <AmbientBackground />
            <AppNavbar />

            <main className="relative z-10 mx-auto max-w-[92rem] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(16,16,16,0.98),rgba(10,10,10,0.82))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-8 lg:flex lg:items-end lg:justify-between lg:gap-8"
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/55 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(245,158,11,0.08),transparent_32%,rgba(161,161,170,0.06))]" />
                    <div className="max-w-3xl">
                        <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">
                            <FileText size={14} />
                            Stored Extractions
                        </p>
                        <h1 className="mt-5 text-3xl font-semibold text-zinc-50 sm:text-5xl">
                            Manage CV Data
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                            Choose a saved CV, then edit its extracted data in the section that opens below.
                        </p>
                    </div>
                    <div className="relative mt-6 grid gap-3 sm:grid-cols-3 lg:mt-0 lg:w-[28rem]">
                        <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition">
                            <p className="text-xs font-semibold uppercase text-zinc-500">CVs</p>
                            <p className="mt-2 text-2xl font-semibold text-zinc-50">{resumes.length}</p>
                        </motion.div>
                        <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition">
                            <p className="text-xs font-semibold uppercase text-zinc-500">Profile</p>
                            <p className="mt-2 truncate text-sm font-semibold text-zinc-100">{selectedProfile}</p>
                        </motion.div>
                        <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition">
                            <p className="text-xs font-semibold uppercase text-zinc-500">Skills</p>
                            <p className="mt-2 text-2xl font-semibold text-amber-200">{selectedSkillCount}</p>
                        </motion.div>
                    </div>
                </motion.div>

                {error && (
                    <div className="mt-6 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-[0_16px_50px_rgba(245,158,11,0.12)]">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mt-6 flex gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100 shadow-[0_16px_50px_rgba(245,158,11,0.12)]">
                        <CheckCircle size={18} className="mt-0.5 shrink-0" />
                        <p>{success}</p>
                    </div>
                )}

                {loadingList ? (
                    <div className="mt-12 flex items-center justify-center gap-3 text-zinc-400">
                        <Loader2 size={18} className="animate-spin" />
                        Loading stored extractions...
                    </div>
                ) : resumes.length === 0 ? (
                    <div className={`${panelClass} mt-8 p-10 text-center`}>
                        <FileText size={38} className="mx-auto text-zinc-500" />
                        <h2 className="mt-4 text-xl font-semibold text-zinc-100">
                            No extracted data yet
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                            Upload a CV first. After Gemini extracts the PDF, the stored record will appear here.
                        </p>
                        <Link
                            to="/upload-cv"
                            className={`${lightButton} mt-6 h-11`}
                        >
                            <Upload size={16} />
                            Upload CV
                        </Link>
                    </div>
                ) : (
                    <div className="mt-8 space-y-6">
                        <motion.aside
                            variants={fadeUp}
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.42, delay: 0.08, ease: "easeOut" }}
                            className={`${panelClass} p-4 sm:p-5`}
                        >
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-zinc-500">Saved CVs</p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        Select a CV to open its profile, skills, experience, education, and projects.
                                    </p>
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-zinc-300">
                                    {resumes.length}
                                </span>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                {resumes.map((resume, index) => (
                                <motion.div
                                    key={resume._id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.28, delay: index * 0.035 }}
                                    whileHover={{ y: -2 }}
                                    className={`rounded-2xl border p-4 transition duration-200 ${
                                        selected?._id === resume._id
                                            ? "border-amber-300/45 bg-amber-300/[0.08] shadow-[0_18px_46px_rgba(245,158,11,0.08)]"
                                            : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-amber-100">
                                            <FileText size={17} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-zinc-100">
                                                {getResumeName(resume)}
                                            </p>
                                            <p className="mt-1 truncate text-xs text-zinc-500">
                                                {resume.originalFileName || formatDate(resume.createdAt)}
                                            </p>
                                            {resume.originalFileName && (
                                                <p className="mt-1 text-xs text-zinc-600">
                                                    {formatDate(resume.createdAt)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEditor(resume._id)}
                                            disabled={loadingDetail === resume._id}
                                            className={`${lightButton} h-10 flex-1 px-3 text-xs`}
                                        >
                                            {loadingDetail === resume._id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Eye size={14} />
                                            )}
                                            Edit Data
                                        </button>
                                        <Link
                                            to={`/resumes/${resume._id}/market`}
                                            className={`${subtleButton} h-10 px-3 text-xs`}
                                            aria-label={`Open market comparison for ${getResumeName(resume)}`}
                                        >
                                            <Target size={14} />
                                            <span className="hidden sm:inline xl:hidden 2xl:inline">Market</span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(resume)}
                                            disabled={deletingId === resume._id}
                                            className={dangerIconButton}
                                            aria-label={`Delete ${getResumeName(resume)}`}
                                        >
                                            {deletingId === resume._id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                                ))}
                            </div>
                        </motion.aside>

                        {!form || !selected ? (
                            <motion.section
                                variants={fadeUp}
                                initial="hidden"
                                animate="visible"
                                transition={{ duration: 0.38, ease: "easeOut" }}
                                className={`${panelClass} flex items-center justify-center p-8 text-center`}
                            >
                                <div>
                                    <Eye size={36} className="mx-auto text-zinc-500" />
                                    <h2 className="mt-4 text-xl font-semibold text-zinc-100">
                                        Select a CV to edit
                                    </h2>
                                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                                        The extracted fields will open here in the same page flow, without splitting the workspace into separate left and right panels.
                                    </p>
                                </div>
                            </motion.section>
                        ) : (
                            <motion.section
                                variants={fadeUp}
                                initial="hidden"
                                animate="visible"
                                transition={{ duration: 0.38, ease: "easeOut" }}
                                className={panelClass}
                            >
                                <div className="h-px bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />
                                <div className="space-y-5 p-4 sm:p-6 lg:p-7">
                                    <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                            <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                                                Active extraction
                                            </p>
                                            <h2 className="truncate text-2xl font-semibold text-zinc-50">
                                                {getResumeName(selected)}
                                            </h2>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {selected.originalFileName || "Editing extracted data saved in MongoDB"}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                disabled={saving}
                                                className={`${lightButton} h-11`}
                                            >
                                                {saving ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Save size={16} />
                                                )}
                                                Save Changes
                                            </button>
                                            <Link
                                                to={`/resumes/${selected._id}/market`}
                                                className={`${primaryButton} h-11`}
                                            >
                                                <Target size={16} />
                                                Market Match
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={closeEditor}
                                                className={`${subtleButton} h-11`}
                                            >
                                                <X size={16} />
                                                Hide Data
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0a]/70 p-1">
                                        <div className="flex min-w-max gap-1">
                                            {editorTabs.map(({ id, label, icon: Icon }) => {
                                                const isActive = activeEditorTab === id;

                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => setActiveEditorTab(id)}
                                                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                                                            isActive
                                                                ? "bg-zinc-100 text-zinc-950 shadow-[0_12px_32px_rgba(247,245,239,0.12)]"
                                                                : "text-zinc-400 hover:bg-white/[0.055] hover:text-zinc-100"
                                                        }`}
                                                    >
                                                        <Icon size={15} />
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className={tabViewportClass}>
                                    <AnimatePresence mode="wait">
                                        {activeEditorTab === "profile" && (
                                            <motion.div
                                                key="profile"
                                                {...tabMotion}
                                                transition={{ duration: 0.22, ease: "easeOut" }}
                                                className="space-y-5"
                                            >
                                            <Section title="Resume Details">
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <TextInput
                                                        label="Title"
                                                        value={form.title}
                                                        onChange={(value) => updateForm("title", value)}
                                                    />
                                                    <TextArea
                                                        label="Tags"
                                                        value={form.tagsText}
                                                        rows={2}
                                                        placeholder="One tag per line"
                                                        onChange={(value) => updateForm("tagsText", value)}
                                                    />
                                                </div>
                                                <div className="mt-4">
                                                    <TextArea
                                                        label="Notes"
                                                        value={form.notes}
                                                        rows={3}
                                                        onChange={(value) => updateForm("notes", value)}
                                                    />
                                                </div>
                                            </Section>

                                            <Section title="Personal Info">
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <TextInput
                                                        label="Name"
                                                        value={form.personalInfo.name}
                                                        onChange={(value) => updatePersonalInfo("name", value)}
                                                    />
                                                    <TextInput
                                                        label="Email"
                                                        value={form.personalInfo.email}
                                                        onChange={(value) => updatePersonalInfo("email", value)}
                                                    />
                                                    <TextInput
                                                        label="Phone"
                                                        value={form.personalInfo.phone}
                                                        onChange={(value) => updatePersonalInfo("phone", value)}
                                                    />
                                                    <TextInput
                                                        label="Location"
                                                        value={form.personalInfo.location}
                                                        onChange={(value) => updatePersonalInfo("location", value)}
                                                    />
                                                </div>
                                            </Section>

                                            <Section title="Summary">
                                                <TextArea
                                                    label="Profile summary"
                                                    value={form.summary}
                                                    rows={5}
                                                    onChange={(value) => updateForm("summary", value)}
                                                />
                                            </Section>

                                            <Section title="Profile Details">
                                                <div className="grid gap-4 sm:grid-cols-3">
                                                    <TextInput
                                                        label="Main profile"
                                                        value={form.mainProfile}
                                                        onChange={(value) => updateForm("mainProfile", value)}
                                                    />
                                                    <TextInput
                                                        label="Seniority"
                                                        value={form.seniorityLevel}
                                                        onChange={(value) => updateForm("seniorityLevel", value)}
                                                    />
                                                    <TextInput
                                                        label="Years"
                                                        value={form.yearsOfExperience}
                                                        onChange={(value) => updateForm("yearsOfExperience", value)}
                                                    />
                                                </div>
                                            </Section>
                                            </motion.div>
                                        )}

                                        {activeEditorTab === "skills" && (
                                            <motion.div
                                                key="skills"
                                                {...tabMotion}
                                                transition={{ duration: 0.22, ease: "easeOut" }}
                                                className="grid gap-5 xl:grid-cols-2"
                                            >
                                            <Section title="Technical Skills">
                                                <TextArea
                                                    label="Use lines or category: skill, skill"
                                                    value={form.skillsText}
                                                    rows={8}
                                                    onChange={(value) => updateForm("skillsText", value)}
                                                />
                                            </Section>
                                            <Section title="Soft Skills">
                                                <TextArea
                                                    label="One skill per line"
                                                    value={form.softSkillsText}
                                                    rows={8}
                                                    onChange={(value) => updateForm("softSkillsText", value)}
                                                />
                                            </Section>
                                            <Section title="Languages">
                                                <TextArea
                                                    label="One language per line"
                                                    value={form.languagesText}
                                                    rows={6}
                                                    onChange={(value) => updateForm("languagesText", value)}
                                                />
                                            </Section>
                                            <Section title="Certifications">
                                                <TextArea
                                                    label="One certification per line"
                                                    value={form.certificationsText}
                                                    rows={6}
                                                    onChange={(value) => updateForm("certificationsText", value)}
                                                />
                                            </Section>
                                            </motion.div>
                                        )}

                                        {activeEditorTab === "experience" && (
                                            <motion.div
                                                key="experience"
                                                {...tabMotion}
                                                transition={{ duration: 0.22, ease: "easeOut" }}
                                            >
                                            <Section
                                                title="Experience"
                                                action={
                                                    <button
                                                        type="button"
                                                        onClick={() => addArrayItem("experience", emptyExperience)}
                                                        className={`${subtleButton} h-9 px-3 text-xs`}
                                                    >
                                                        <Plus size={14} />
                                                        Add
                                                    </button>
                                                }
                                            >
                                                <div className="space-y-4">
                                                    {form.experience.map((item, index) => (
                                                        <div key={index} className={itemCardClass}>
                                                        <div className="mb-4 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeArrayItem("experience", index, emptyExperience)}
                                                                className={dangerIconButton}
                                                                aria-label="Remove experience"
                                                            >
                                                                <X size={15} />
                                                            </button>
                                                        </div>
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <TextInput
                                                                label="Title"
                                                                value={item.title}
                                                                onChange={(value) => updateArrayItem("experience", index, "title", value)}
                                                            />
                                                            <TextInput
                                                                label="Company"
                                                                value={item.company}
                                                                onChange={(value) => updateArrayItem("experience", index, "company", value)}
                                                            />
                                                            <TextInput
                                                                label="Location"
                                                                value={item.location}
                                                                onChange={(value) => updateArrayItem("experience", index, "location", value)}
                                                            />
                                                            <div className="grid gap-4 sm:grid-cols-2">
                                                                <TextInput
                                                                    label="Start"
                                                                    value={item.startDate}
                                                                    onChange={(value) => updateArrayItem("experience", index, "startDate", value)}
                                                                />
                                                                <TextInput
                                                                    label="End"
                                                                    value={item.endDate}
                                                                    onChange={(value) => updateArrayItem("experience", index, "endDate", value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-4">
                                                            <TextArea
                                                                label="Description"
                                                                value={item.description}
                                                                rows={3}
                                                                onChange={(value) => updateArrayItem("experience", index, "description", value)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            </Section>
                                        </motion.div>
                                    )}

                                        {activeEditorTab === "education" && (
                                            <motion.div
                                                key="education"
                                                {...tabMotion}
                                                transition={{ duration: 0.22, ease: "easeOut" }}
                                            >
                                                <Section
                                                    title="Education"
                                                    action={
                                                        <button
                                                            type="button"
                                                            onClick={() => addArrayItem("education", emptyEducation)}
                                                            className={`${subtleButton} h-9 px-3 text-xs`}
                                                        >
                                                            <Plus size={14} />
                                                            Add
                                                        </button>
                                                    }
                                                >
                                            <div className="space-y-4">
                                                {form.education.map((item, index) => (
                                                    <div key={index} className={itemCardClass}>
                                                        <div className="mb-4 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeArrayItem("education", index, emptyEducation)}
                                                                className={dangerIconButton}
                                                                aria-label="Remove education"
                                                            >
                                                                <X size={15} />
                                                            </button>
                                                        </div>
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <TextInput
                                                                label="Degree"
                                                                value={item.degree}
                                                                onChange={(value) => updateArrayItem("education", index, "degree", value)}
                                                            />
                                                            <TextInput
                                                                label="Institution"
                                                                value={item.institution}
                                                                onChange={(value) => updateArrayItem("education", index, "institution", value)}
                                                            />
                                                            <TextInput
                                                                label="Location"
                                                                value={item.location}
                                                                onChange={(value) => updateArrayItem("education", index, "location", value)}
                                                            />
                                                            <TextInput
                                                                label="Year"
                                                                value={item.year}
                                                                onChange={(value) => updateArrayItem("education", index, "year", value)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                                </Section>
                                            </motion.div>
                                        )}

                                        {activeEditorTab === "projects" && (
                                            <motion.div
                                                key="projects"
                                                {...tabMotion}
                                                transition={{ duration: 0.22, ease: "easeOut" }}
                                            >
                                                <Section
                                                    title="Projects"
                                                    action={
                                                        <button
                                                            type="button"
                                                            onClick={() => addArrayItem("projects", emptyProject)}
                                                            className={`${subtleButton} h-9 px-3 text-xs`}
                                                        >
                                                            <Plus size={14} />
                                                            Add
                                                        </button>
                                                    }
                                                >
                                            <div className="space-y-4">
                                                {form.projects.map((item, index) => (
                                                    <div key={index} className={itemCardClass}>
                                                        <div className="mb-4 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeArrayItem("projects", index, emptyProject)}
                                                                className={dangerIconButton}
                                                                aria-label="Remove project"
                                                            >
                                                                <X size={15} />
                                                            </button>
                                                        </div>
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <TextInput
                                                                label="Name"
                                                                value={item.name}
                                                                onChange={(value) => updateArrayItem("projects", index, "name", value)}
                                                            />
                                                            <TextArea
                                                                label="Technologies"
                                                                value={item.technologiesText}
                                                                rows={2}
                                                                onChange={(value) => updateArrayItem("projects", index, "technologiesText", value)}
                                                            />
                                                        </div>
                                                        <div className="mt-4">
                                                            <TextArea
                                                                label="Description"
                                                                value={item.description}
                                                                rows={3}
                                                                onChange={(value) => updateArrayItem("projects", index, "description", value)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                                </Section>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    </div>
                                </div>
                            </motion.section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default Resumes;
