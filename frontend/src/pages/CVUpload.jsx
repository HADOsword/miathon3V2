import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BrainCircuit,
    CheckCircle,
    Database,
    FileText,
    Loader2,
    Sparkles,
    Upload,
} from "lucide-react";
import AmbientBackground from "../components/landing/AmbientBackground";
import AppNavbar from "../components/AppNavbar";
import { getApiErrorMessage, isUnauthorizedError } from "../api/client";
import { uploadCV } from "../api/cvApi";

const formatFileSize = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const maxFileSize = 5 * 1024 * 1024;
const allowedFiles = new Map([
    ["pdf", "application/pdf"],
    [
        "docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
]);

const uploadSteps = [
    { label: "Upload", detail: "PDF or DOCX", icon: Upload },
    { label: "Analyze", detail: "Gemini extraction", icon: BrainCircuit },
    { label: "Save", detail: "Stored privately", icon: Database },
];

const getFileExtension = (name = "") => name.split(".").pop()?.toLowerCase() || "";
const isQueuedN8nUpload = (result) =>
    result?.resume?.processingStatus !== "PROFILE_EXTRACTED" && result?.n8n?.triggered;

function CVUpload() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [saveResult, setSaveResult] = useState(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
            return;
        }

        if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        const extension = getFileExtension(file.name);
        const expectedMimeType = allowedFiles.get(extension);

        if (!expectedMimeType || file.type !== expectedMimeType) {
            setError("Only valid PDF and DOCX files are accepted.");
            setSelectedFile(null);
            setSaveResult(null);
            return;
        }

        if (file.size > maxFileSize) {
            setError("CV file size must be less than 5MB.");
            setSelectedFile(null);
            setSaveResult(null);
            return;
        }

        setError("");
        setSelectedFile(file);
        setSaveResult(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setError("");

        try {
            const data = await uploadCV(selectedFile);
            setSaveResult(data);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                navigate("/login", { replace: true });
                return;
            }

            setError(getApiErrorMessage(err, "Upload failed. Please try again."));
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setSaveResult(null);
        setError("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const savedFileName =
        saveResult?.resume?.originalFileName || selectedFile?.name || "CV file";

    if (saveResult) {
        return (
            <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-[#f7f5ef]">
                <AmbientBackground />
                <AppNavbar />

                <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center px-5 pb-16 pt-6 sm:px-8">
                    <motion.section
                        className="relative w-full overflow-hidden rounded-[1.6rem] border border-white/15 bg-[linear-gradient(135deg,rgba(16,16,16,0.96),rgba(8,8,8,0.9))] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: "easeOut" }}
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(245,158,11,0.08),transparent_34%,rgba(247,245,239,0.035))]" />
                        <div className="relative p-6 text-center sm:p-8 lg:p-10">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-300 shadow-[0_18px_50px_rgba(245,158,11,0.14)]">
                                <CheckCircle size={34} />
                            </div>
                            <h1 className="mt-5 text-2xl font-semibold text-[#f7f5ef] sm:text-3xl">
                                {isQueuedN8nUpload(saveResult) ? "CV uploaded and analysis started" : "CV analyzed and saved"}
                            </h1>
                            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">
                                {isQueuedN8nUpload(saveResult)
                                    ? `${savedFileName} is stored. n8n is finishing the extraction and market analysis in the background.`
                                    : `${savedFileName} is stored with its extracted analysis in your resume records.`}
                            </p>

                            <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
                                {uploadSteps.map(({ label, icon: Icon }) => (
                                    <div
                                        key={label}
                                        className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.065] p-4 text-center"
                                    >
                                        <Icon size={18} className="mx-auto text-amber-200" />
                                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100">
                                            {label}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                                        <FileText size={16} />
                                        Original CV
                                    </div>
                                    <p className="mt-2 truncate text-sm text-zinc-400">{savedFileName}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                                        <Database size={16} />
                                        Resume Record
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-400">Saved securely in MongoDB</p>
                                </div>
                            </div>

                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f7f5ef] px-5 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white"
                                >
                                    <Upload size={17} />
                                    Upload Another CV
                                </button>
                                <Link
                                    to="/resumes"
                                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 text-sm font-semibold text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-200/60 hover:bg-amber-300/15"
                                >
                                    <FileText size={17} />
                                    Manage Data
                                    <ArrowRight size={16} />
                                </Link>
                                <Link
                                    to="/dashboard"
                                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08] hover:text-white"
                                >
                                    <ArrowLeft size={17} />
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    </motion.section>
                </main>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-[#f7f5ef]">
            <AmbientBackground />
            <AppNavbar />

            <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[92rem] flex-col gap-8 px-5 pb-10 pt-6 sm:px-8 lg:pb-16 lg:pt-8">
                <motion.aside
                    className="min-w-0"
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                >
                    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-4 py-2 text-sm font-semibold text-amber-100 backdrop-blur-md">
                        <Sparkles size={15} className="text-amber-400" />
                        AI Extraction
                    </div>

                    <h2 className="max-w-xl text-4xl font-semibold leading-tight text-[#f7f5ef] xl:text-5xl">
                        Upload your CV, save{" "}
                        <span className="bg-gradient-to-r from-amber-300 via-amber-100 to-zinc-300 bg-clip-text text-transparent">
                            structured data
                        </span>
                    </h2>
                    <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
                        The AI reads the PDF or DOCX and stores the extracted profile information in your database.
                    </p>

                    <div className="mt-8 grid gap-4 xl:grid-cols-3">
                        {uploadSteps.map(({ label, detail, icon: Icon }, index) => (
                            <div
                                key={label}
                                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-100">
                                        <Icon size={18} />
                                    </span>
                                    <span className="text-xs font-bold text-zinc-600">0{index + 1}</span>
                                </div>
                                <h3 className="mt-4 text-sm font-semibold text-[#f7f5ef]">{label}</h3>
                                <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
                            </div>
                        ))}
                    </div>
                </motion.aside>

                <motion.section
                    className="relative mx-auto w-full min-w-0 max-w-3xl overflow-hidden rounded-[1.6rem] border border-white/15 bg-[linear-gradient(135deg,rgba(16,16,16,0.96),rgba(8,8,8,0.9))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-8"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
                >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

                    <div className="mb-7">
                        <p className="text-sm font-semibold text-zinc-300">CV Upload</p>
                        <h1 className="mt-3 text-2xl font-semibold leading-tight text-[#f7f5ef] sm:text-3xl">
                            Drop your CV here
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-zinc-400">
                            Upload a PDF or DOCX file and save the AI extraction to your resumes collection.
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-5 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100"
                        >
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div
                        className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.35rem] border-2 border-dashed p-8 text-center transition ${
                            dragActive
                                ? "border-amber-400/60 bg-amber-500/[0.08] shadow-[0_18px_52px_rgba(245,158,11,0.12)]"
                                : selectedFile
                                  ? "border-amber-400/40 bg-amber-500/[0.04]"
                                  : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {selectedFile ? (
                            <>
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/[0.09] text-amber-300">
                                    <CheckCircle size={34} />
                                </div>
                                <p className="max-w-full truncate text-sm font-semibold text-[#f7f5ef]">
                                    {selectedFile.name}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                                <button
                                    type="button"
                                    className="mt-4 text-xs text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                        setSaveResult(null);
                                        setError("");

                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = "";
                                        }
                                    }}
                                >
                                    Remove and choose another
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] text-zinc-300">
                                    <Upload size={32} />
                                </div>
                                <p className="text-sm font-semibold text-zinc-200">
                                    Drag and drop your CV here
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    or click to browse - PDF/DOCX, max 5MB
                                </p>
                            </>
                        )}
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
                        {uploadSteps.map(({ label, detail }) => (
                            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                                <p className="font-semibold text-zinc-200">{label}</p>
                                <p className="mt-1">{detail}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="group mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f7f5ef] px-5 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_52px_rgba(245,245,240,0.28)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                        disabled={!selectedFile || uploading}
                        onClick={handleUpload}
                        aria-busy={uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={17} className="animate-spin" />
                                Analyzing and saving...
                            </>
                        ) : (
                            <>
                                <Sparkles size={17} />
                                Analyze and Save CV
                            </>
                        )}
                    </button>

                    <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
                        Powered by Gemini AI. Your data stays secure.
                    </p>
                </motion.section>
            </main>
        </div>
    );
}

export default CVUpload;
