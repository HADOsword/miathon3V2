import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import AmbientBackground from "../components/landing/AmbientBackground";
import AppNavbar from "../components/AppNavbar";
import { getApiErrorMessage, isUnauthorizedError } from "../api/client";
import {
  compareResumeWithJobs,
  getLatestResumeJobComparison,
  getResume,
} from "../api/resumeApi";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  `${buttonBase} bg-amber-300 px-4 text-zinc-950 shadow-[0_16px_42px_rgba(245,158,11,0.16)] hover:bg-amber-200`;
const subtleButton =
  `${buttonBase} border border-white/10 bg-white/[0.045] px-4 text-zinc-200 hover:border-white/25 hover:bg-white/[0.08]`;
const panelClass =
  "rounded-2xl border border-white/10 bg-[#101010]/88 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl";
const fieldClass =
  "mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0a0a0a]/80 px-3.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-white/18 focus:border-amber-300/60 focus:bg-[#111111] focus:ring-2 focus:ring-amber-300/15";
const roadmapThemes = [
  {
    label: "from-amber-400 to-yellow-300",
    accent: "text-zinc-300",
    border: "border-amber-400/28",
    glow: "shadow-[0_18px_44px_rgba(245,158,11,0.11)]",
  },
  {
    label: "from-[#f7f5ef] to-zinc-400",
    accent: "text-zinc-300",
    border: "border-white/15",
    glow: "shadow-[0_18px_44px_rgba(247,245,239,0.07)]",
  },
  {
    label: "from-amber-300 to-amber-500",
    accent: "text-zinc-300",
    border: "border-amber-300/24",
    glow: "shadow-[0_18px_44px_rgba(251,191,36,0.10)]",
  },
  {
    label: "from-zinc-200 to-amber-300",
    accent: "text-zinc-300",
    border: "border-white/12",
    glow: "shadow-[0_18px_44px_rgba(161,161,170,0.08)]",
  },
];
const roadmapBarColors = [
  "bg-amber-400",
  "bg-[#f7f5ef]",
  "bg-zinc-500",
  "bg-amber-200",
  "bg-zinc-300",
];

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const getResumeName = (resume) =>
  resume?.title || resume?.originalFileName || "Untitled resume";

const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
};

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const getItemLabel = (item) => {
  if (typeof item === "string") return item;
  if (isPlainObject(item)) {
    return toText(item.name || item.skill || item.technology || item.tool || item.title || "");
  }

  return toText(item);
};

const uniqueLabels = (items) => {
  const seen = new Set();

  return asArray(items)
    .map(getItemLabel)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const getPercentNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
};

const formatPercent = (value) => `${getPercentNumber(value)}%`;

const truncateText = (value, limit = 280) => {
  const text = toText(value).trim();

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trim()}...`;
};

const getAnalysis = (analysis) =>
  analysis?.marketAnalysis || analysis?.jobMarketAnalysis?.marketAnalysis || {};

const getComparison = (analysis) =>
  analysis?.profileComparison || analysis?.jobMarketAnalysis?.profileComparison || {};

const getMarketTools = (market, comparison) => [
  ...asArray(comparison.dominant_market_tools),
  ...asArray(market.dominant_technical_skills),
  ...asArray(market.common_tools),
  ...asArray(market.common_frameworks),
  ...asArray(market.common_databases),
  ...asArray(market.common_programming_languages),
];

const getRecommendedJobs = (analysis) => {
  const jobs = asArray(analysis?.jobs);
  const comparison = getComparison(analysis);
  const recommendations = asArray(comparison.recommended_jobs);

  if (recommendations.length === 0) {
    return jobs.map((job) => ({ ...job, recommendation: null }));
  }

  return recommendations.map((recommendation) => {
    const job = jobs.find((item) => item.job_id === recommendation.job_id) || {};

    return {
      ...job,
      job_id: recommendation.job_id || job.job_id,
      recommendation,
    };
  });
};

function TextInput({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-zinc-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

function Metric({ icon: Icon, label, value, tone = "text-zinc-50" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
        <Icon size={15} />
        {label}
      </div>
      <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function MatchOverview({ score, jobsCount, gapCount, bestJob, focusSkill }) {
  const scoreValue = getPercentNumber(score);
  const readiness =
    scoreValue >= 75 ? "Strong fit" : scoreValue >= 50 ? "Promising fit" : "Needs focused work";
  const focusLabel = focusSkill ? getItemLabel(focusSkill) : "No urgent gap";
  const bestJobTitle = bestJob?.job_title || "No recommended offer yet";
  const bestJobMatch = bestJob?.recommendation?.match_percentage;

  return (
    <section className={`${panelClass} overflow-hidden p-5 sm:p-6`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div
            className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#fbbf24 ${scoreValue * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
            }}
            aria-label={`Overall match ${scoreValue}%`}
          >
            <div className="flex h-[5.8rem] w-[5.8rem] items-center justify-center rounded-full border border-white/10 bg-[#101010]">
              <span className="text-3xl font-semibold text-amber-200">{scoreValue}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">Overall match</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#f7f5ef]">{readiness}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Review the strongest signals, then build the roadmap for the missing skills.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">Jobs analyzed</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{jobsCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-zinc-500">Next focus</p>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[0.68rem] font-bold text-zinc-300">
                {gapCount} gaps
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-amber-100">
              {focusLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-zinc-500">Best offer</p>
              {bestJobMatch !== undefined && (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2 py-0.5 text-[0.68rem] font-bold text-amber-100">
                  {formatPercent(bestJobMatch)}
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-zinc-100">
              {bestJobTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-amber-300"
          initial={{ width: 0 }}
          animate={{ width: `${scoreValue}%` }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />
      </div>
    </section>
  );
}

function PillList({ items, limit = 14, empty = "No data returned" }) {
  const labels = uniqueLabels(items);

  if (labels.length === 0) {
    return <p className="text-sm text-zinc-500">{empty}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.slice(0, limit).map((item) => (
        <span
          key={item}
          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-200"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function RoadmapMiniBars({ stage }) {
  return (
    <div className="mt-4 grid w-44 max-w-full grid-cols-6 gap-1.5" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={`${stage}-${index}`}
          className={`h-1 rounded-full ${roadmapBarColors[(index + stage) % roadmapBarColors.length]}`}
          style={{ gridColumn: `span ${index % 3 === 0 ? 3 : index % 3 === 1 ? 2 : 1}` }}
        />
      ))}
    </div>
  );
}

function RoadmapPoster({ roadmap, profile }) {
  const stages = roadmap.slice(0, 8).map((item, index) => {
    const title = toText(item.technology || item.skill || item.tool || item.name || `Stage ${index + 1}`);
    const steps = asArray(item.steps).map(toText).filter(Boolean);

    return {
      title,
      priority: toText(item.priority || item.level || ""),
      why: toText(item.why || item.reason || item.description || ""),
      steps,
    };
  });
  const title = `${toText(profile || "Career").trim() || "Career"} Roadmap`.toUpperCase();
  const currentYear = new Date().getFullYear();

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[linear-gradient(135deg,#030303_0%,#101010_58%,#050505_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-7 lg:p-9">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(245,158,11,0.08),transparent_34%,rgba(247,245,239,0.035))]" />
      <div className="pointer-events-none absolute inset-0 cv-grid opacity-35" />

      <div className="relative z-10 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.045] px-3 py-1.5 text-xs font-bold uppercase text-zinc-200">
          <Sparkles size={14} className="text-amber-400" />
          Learning Path
        </p>
        <h2 className="mx-auto mt-4 max-w-5xl break-words text-3xl font-black uppercase leading-tight text-[#f7f5ef] sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        <p className="mt-2 text-4xl font-black text-amber-400 sm:text-5xl">
          {currentYear}
        </p>
      </div>

      {stages.length === 0 ? (
        <div className="relative z-10 mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-zinc-400">
          No roadmap was returned.
        </div>
      ) : (
        <div className="relative z-10 mt-10 grid gap-x-7 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage, index) => {
            const theme = roadmapThemes[index % roadmapThemes.length];
            const hasConnector = index < stages.length - 1 && (index + 1) % 4 !== 0;

            return (
              <motion.article
                key={`${stage.title}-${index}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className={`relative ${index % 2 === 1 ? "xl:mt-16" : ""}`}
              >
                {hasConnector && (
                  <span className="pointer-events-none absolute left-[calc(100%-0.25rem)] top-[4.15rem] hidden h-9 w-8 rounded-tr-2xl border-r border-t border-amber-400/50 xl:block" />
                )}
                <div className={`h-full rounded-2xl border ${theme.border} bg-white/[0.035] p-4 ${theme.glow} backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-amber-400/35 hover:bg-white/[0.055]`}>
                  <h3 className="min-h-14 break-words text-xl font-black uppercase leading-tight text-[#f7f5ef]">
                    {stage.title}
                  </h3>
                  <div className={`mt-3 flex min-h-10 items-center justify-between gap-3 rounded-lg bg-gradient-to-r ${theme.label} px-3 py-2 text-sm font-black uppercase text-zinc-950`}>
                    <span>Stage {index + 1}</span>
                    {stage.priority && (
                      <span className="text-[0.68rem] leading-none text-zinc-900/80">
                        {stage.priority}
                      </span>
                    )}
                  </div>

                  {stage.why && (
                    <p className={`mt-3 text-xs font-semibold leading-5 ${theme.accent}`}>
                      {stage.why}
                    </p>
                  )}

                  {stage.steps.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-xs leading-5 text-zinc-300">
                      {stage.steps.slice(0, 4).map((step, stepIndex) => (
                        <li key={`${step}-${stepIndex}`} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <RoadmapMiniBars stage={index} />
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Rocket
        size={150}
        className="pointer-events-none absolute bottom-[-2rem] right-4 hidden rotate-[-18deg] text-amber-400/18 md:block"
        aria-hidden="true"
      />
    </section>
  );
}

function RoadmapBuilder({ status, onCreate }) {
  const isBuilding = status === "building";

  return (
    <section className={`${panelClass} relative overflow-hidden p-6 text-center sm:p-8`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(245,158,11,0.07),transparent_38%,rgba(247,245,239,0.035))]" />

      <div className="relative mx-auto max-w-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] text-amber-400">
          {isBuilding ? (
            <Loader2 size={25} className="animate-spin" />
          ) : (
            <Rocket size={25} />
          )}
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
          Learning Path
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[#f7f5ef] sm:text-3xl">
          {isBuilding ? "Building your roadmap" : "Create a roadmap for you"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          {isBuilding
            ? "We are organizing your missing skills, stages, priorities, and learning steps. This takes a moment."
            : "The roadmap is hidden until you ask for it. Click the button and we will prepare it before showing the final path."}
        </p>

        {isBuilding ? (
          <div className="mx-auto mt-7 grid max-w-md grid-cols-6 gap-2" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <motion.span
                key={index}
                className={`h-1.5 rounded-full ${
                  index % 3 === 0 ? "bg-amber-400" : index % 3 === 1 ? "bg-[#f7f5ef]" : "bg-zinc-600"
                }`}
                animate={{ opacity: [0.32, 1, 0.32] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.045 }}
                style={{ gridColumn: `span ${index % 4 === 0 ? 3 : index % 4 === 1 ? 2 : 1}` }}
              />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className={`${primaryButton} mt-7 h-12 px-5`}
          >
            <Sparkles size={17} />
            Create a roadmap for you
          </button>
        )}
      </div>
    </section>
  );
}

function ScrollPanel({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`${panelClass} min-h-0 p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Icon size={17} className="text-amber-200" />
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MarketComparison() {
  const { id } = useParams();
  const navigate = useNavigate();
  const roadmapTimerRef = useRef(null);

  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [filters, setFilters] = useState({
    country: "ma",
    location: "",
    jobsLimit: "10",
  });
  const [loadingResume, setLoadingResume] = useState(true);
  const [loadingSavedAnalysis, setLoadingSavedAnalysis] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [hasSavedAnalysis, setHasSavedAnalysis] = useState(false);
  const [roadmapStatus, setRoadmapStatus] = useState("idle");
  const [showAllOffers, setShowAllOffers] = useState(false);
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

    const loadInitialData = async () => {
      try {
        const [resumeData, savedData] = await Promise.all([
          getResume(id),
          getLatestResumeJobComparison(id),
        ]);
        if (!isMounted) return;
        setResume(resumeData.resume);

        if (savedData.hasAnalysis) {
          setAnalysis(savedData);
          setHasSavedAnalysis(true);
          setRoadmapStatus("idle");
          setShowAllOffers(false);
          setFilters((current) => ({
            ...current,
            country: savedData.country || current.country,
            jobsLimit: savedData.count ? String(savedData.count) : current.jobsLimit,
          }));
        } else {
          setAnalysis(null);
          setHasSavedAnalysis(false);
          setRoadmapStatus("idle");
          setShowAllOffers(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(handleRequestError(err, "Could not load this CV and its saved market comparison."));
      } finally {
        if (isMounted) {
          setLoadingResume(false);
          setLoadingSavedAnalysis(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [handleRequestError, id]);

  useEffect(() => () => {
    if (roadmapTimerRef.current) {
      window.clearTimeout(roadmapTimerRef.current);
    }
  }, []);

  const resumeAnalysis = isPlainObject(resume?.analysis) ? resume.analysis : {};
  const market = getAnalysis(analysis);
  const comparison = getComparison(analysis);
  const missingSkills = asArray(comparison.missing_skills);
  const roadmap = asArray(comparison.roadmap);
  const recommendedJobs = getRecommendedJobs(analysis);
  const marketTools = getMarketTools(market, comparison);
  const visibleRecommendedJobs = recommendedJobs.slice(0, showAllOffers ? 8 : 4);
  const jobsAnalyzedCount = analysis?.count || market.jobs_analyzed_count || 0;
  const bestRecommendedJob = recommendedJobs[0] || null;
  const firstMissingSkill = missingSkills[0] || null;
  const matchedSkillCount = uniqueLabels(comparison.matched_skills).length;
  const marketToolCount = uniqueLabels(marketTools).length;

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleCreateRoadmap = () => {
    if (roadmapTimerRef.current) {
      window.clearTimeout(roadmapTimerRef.current);
    }

    setRoadmapStatus("building");
    roadmapTimerRef.current = window.setTimeout(() => {
      setRoadmapStatus("ready");
      roadmapTimerRef.current = null;
    }, 2400);
  };

  const handleCompare = async () => {
    if (!id) return;

    if (roadmapTimerRef.current) {
      window.clearTimeout(roadmapTimerRef.current);
      roadmapTimerRef.current = null;
    }

    setLoadingAnalysis(true);
    setRoadmapStatus("idle");
    setShowAllOffers(false);
    setError("");
    setSuccess("");

    try {
      const data = await compareResumeWithJobs(id, {
        country: filters.country.trim() || "ma",
        location: filters.location.trim(),
        jobs_limit: filters.jobsLimit.trim() || "10",
        num_pages: 1,
      });

      setAnalysis(data);
      setHasSavedAnalysis(true);
      setShowAllOffers(false);
      setSuccess("Market comparison refreshed and linked to this CV.");
    } catch (err) {
      setError(handleRequestError(err, "Could not compare this CV with job offers."));
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-zinc-100">
      <AmbientBackground />
      <AppNavbar />

      <main className="relative z-10 mx-auto max-w-[92rem] px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-5"
        >
          <section className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">
                  <Target size={14} />
                  Market Match
                </p>
                <h1 className="mt-4 truncate text-3xl font-semibold text-zinc-50 sm:text-4xl">
                  {loadingResume ? "Loading CV..." : getResumeName(resume)}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                This page shows the final saved comparison linked to this CV. Refresh it only when you want new job-market data.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:w-[30rem]">
                <TextInput
                  label="Country"
                  value={filters.country}
                  placeholder="ma"
                  onChange={(value) => updateFilter("country", value)}
                />
                <TextInput
                  label="Location"
                  value={filters.location}
                  placeholder="Casablanca, Remote..."
                  onChange={(value) => updateFilter("location", value)}
                />
                <TextInput
                  label="Jobs"
                  value={filters.jobsLimit}
                  placeholder="10"
                  onChange={(value) => updateFilter("jobsLimit", value)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCompare}
                disabled={loadingResume || loadingSavedAnalysis || loadingAnalysis}
                className={`${primaryButton} h-11`}
              >
                {loadingAnalysis ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Target size={16} />
                )}
                {hasSavedAnalysis ? "Refresh Comparison" : "Create Comparison"}
              </button>
              <Link to="/resumes" className={`${subtleButton} h-11`}>
                Edit CV Data
              </Link>
            </div>
          </section>

          <section className={`${panelClass} p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase text-zinc-500">Extracted profile</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric
                icon={FileText}
                label="Profile"
                value={resumeAnalysis.main_profile || "-"}
              />
              <Metric
                icon={Sparkles}
                label="Seniority"
                value={resumeAnalysis.seniority_level || "-"}
              />
            </div>
          </section>
        </motion.div>

        {error && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {loadingSavedAnalysis ? (
          <section className={`${panelClass} mt-5 flex min-h-[22rem] items-center justify-center p-8 text-center`}>
            <div>
              <Loader2 size={34} className="mx-auto animate-spin text-zinc-500" />
              <h2 className="mt-4 text-xl font-semibold text-zinc-100">
                Loading saved comparison
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                Checking if this CV already has final market information linked to it.
              </p>
            </div>
          </section>
        ) : !analysis ? (
          <section className={`${panelClass} mt-5 flex min-h-[22rem] items-center justify-center p-8 text-center`}>
            <div>
              <Target size={38} className="mx-auto text-zinc-500" />
              <h2 className="mt-4 text-xl font-semibold text-zinc-100">
                No saved comparison yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                Create it once, then this CV will keep its final market information for the next time you open this page.
              </p>
            </div>
          </section>
        ) : (
          <div className="mt-5 space-y-5">
            {analysis.analysisWarning && (
              <div className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] p-4 text-sm leading-6 text-amber-100">
                {analysis.analysisWarning}
              </div>
            )}

            <MatchOverview
              score={comparison.overall_match_percentage}
              jobsCount={jobsAnalyzedCount}
              gapCount={missingSkills.length}
              bestJob={bestRecommendedJob}
              focusSkill={firstMissingSkill}
            />

            <div className="space-y-5">
              <ScrollPanel
                title="Skills and Market Signals"
                icon={TrendingUp}
                action={
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-zinc-300">
                      {matchedSkillCount} matched
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-zinc-300">
                      {marketToolCount} tools
                    </span>
                  </div>
                }
              >
                {(comparison.profile_summary || market.market_summary) && (
                  <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-sm leading-7 text-zinc-300">
                      {comparison.profile_summary || market.market_summary}
                    </p>
                  </div>
                )}

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">Matched skills</p>
                    <PillList items={comparison.matched_skills} />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">Dominant market tools</p>
                    <PillList items={marketTools} />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase text-zinc-500">Missing skills</p>
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2.5 py-1 text-xs font-bold text-amber-100">
                      {missingSkills.length} gaps
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {missingSkills.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                        No important gaps were returned.
                      </div>
                    ) : (
                      missingSkills.slice(0, 10).map((skill, index) => (
                        <div key={`${getItemLabel(skill)}-${index}`} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-amber-100">{getItemLabel(skill)}</p>
                            {skill.priority && (
                              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[0.68rem] font-bold uppercase text-zinc-300">
                                {skill.priority}
                              </span>
                            )}
                          </div>
                          {skill.reason && (
                            <p className="mt-2 text-xs leading-5 text-zinc-400">
                              {skill.reason}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </ScrollPanel>

              <ScrollPanel
                title="Recommended Offers"
                icon={Briefcase}
                action={
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-zinc-300">
                    Showing {visibleRecommendedJobs.length} of {recommendedJobs.length}
                  </span>
                }
              >
                {recommendedJobs.length === 0 ? (
                  <p className="text-sm text-zinc-500">No offers were returned for this search.</p>
                ) : (
                  <div className="space-y-3">
                    {visibleRecommendedJobs.map((job, index) => {
                      const recommendation = job.recommendation || {};
                      const match = recommendation.match_percentage;
                      const matchNumber = getPercentNumber(match);

                      return (
                        <article key={`${job.job_id || index}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition duration-200 hover:border-amber-300/25 hover:bg-white/[0.055]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-5 text-zinc-100">
                                {job.job_title || "Job offer"}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {job.employer_name || "Unknown company"}
                              </p>
                            </div>
                            {match !== undefined && (
                              <span className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1 text-xs font-bold text-amber-100">
                                {formatPercent(match)}
                              </span>
                            )}
                          </div>

                          {match !== undefined && (
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className="h-full rounded-full bg-amber-300"
                                style={{ width: `${matchNumber}%` }}
                              />
                            </div>
                          )}

                          {(job.location || job.employment_type) && (
                            <p className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-400">
                              <MapPin size={13} />
                              {[job.location, job.employment_type].filter(Boolean).join(" - ")}
                            </p>
                          )}
                          {recommendation.why_good_fit && (
                            <p className="mt-3 text-sm leading-6 text-zinc-300">
                              {truncateText(recommendation.why_good_fit)}
                            </p>
                          )}
                          {job.apply_url && (
                            <a
                              href={job.apply_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`${subtleButton} mt-4 h-9 px-3 text-xs`}
                            >
                              <ExternalLink size={14} />
                              Open offer
                            </a>
                          )}
                        </article>
                      );
                    })}
                    {recommendedJobs.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllOffers((value) => !value)}
                        className={`${subtleButton} h-10 w-full`}
                      >
                        {showAllOffers ? "Show fewer offers" : `Show ${Math.min(recommendedJobs.length, 8) - 4} more offers`}
                      </button>
                    )}
                  </div>
                )}
              </ScrollPanel>
            </div>

            <div>
              {roadmapStatus === "ready" ? (
                <RoadmapPoster
                  roadmap={roadmap}
                  profile={resumeAnalysis.main_profile || resumeAnalysis.mainProfile}
                />
              ) : (
                <RoadmapBuilder
                  status={roadmapStatus}
                  onCreate={handleCreateRoadmap}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MarketComparison;
