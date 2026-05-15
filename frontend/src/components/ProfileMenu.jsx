import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Camera,
    CheckCircle,
    LogOut,
    Loader2,
    Trash2,
    User,
    X,
} from "lucide-react";
import {
    deleteProfile,
    deleteProfileAvatar,
    getProfile,
    updateProfile,
    updateProfileAvatar,
} from "../api/authApi";
import {
    clearAuthToken,
    getApiErrorMessage,
    getAuthToken,
    isUnauthorizedError,
    setAuthToken,
} from "../api/client";

const PROFILE_CACHE_PREFIX = "cvmentor_profile_cache";

const getInitials = (name = "") =>
    name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

const decodeTokenPayload = (token) => {
    const payload = token.split(".")[1];

    if (!payload) {
        return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    return JSON.parse(atob(padded));
};

const getProfileCacheKey = () => {
    try {
        const token = getAuthToken();
        const userId = decodeTokenPayload(token)?.id;

        return userId ? `${PROFILE_CACHE_PREFIX}:${userId}` : "";
    } catch {
        return "";
    }
};

const normalizeProfile = (user) => {
    if (!user) {
        return null;
    }

    return {
        id: user.id || user._id || "",
        name: user.name || "",
        email: user.email || "",
        avatarUrl: user.avatarUrl || "",
    };
};

const readCachedProfile = () => {
    try {
        const cacheKey = getProfileCacheKey();

        if (!cacheKey) {
            return null;
        }

        return normalizeProfile(JSON.parse(localStorage.getItem(cacheKey) || "null"));
    } catch {
        return null;
    }
};

let cachedProfile = readCachedProfile();

const storeCachedProfile = (user) => {
    const profile = normalizeProfile(user);
    cachedProfile = profile;

    try {
        const cacheKey = getProfileCacheKey();

        if (cacheKey && profile) {
            localStorage.setItem(cacheKey, JSON.stringify(profile));
        }
    } catch {
        // If storage is full or unavailable, the in-memory cache still helps within this session.
    }

    return profile;
};

const clearCachedProfile = () => {
    try {
        const cacheKey = getProfileCacheKey();

        if (cacheKey) {
            localStorage.removeItem(cacheKey);
        }
    } catch {
        // Ignore storage failures.
    }

    cachedProfile = null;
};

const profileToForm = (user) => ({
    name: user?.name || "",
    email: user?.email || "",
});

function ProfileMenu() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const initialProfile = cachedProfile || readCachedProfile();

    const [open, setOpen] = useState(false);
    const [profile, setProfile] = useState(initialProfile);
    const [form, setForm] = useState(() => profileToForm(initialProfile));
    const [loading, setLoading] = useState(!initialProfile);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            try {
                const data = await getProfile();
                if (!isMounted) return;

                const nextProfile = storeCachedProfile(data.user);
                setProfile(nextProfile);
                setForm(profileToForm(nextProfile));
            } catch (err) {
                if (!isMounted) return;
                clearCachedProfile();

                if (isUnauthorizedError(err)) {
                    navigate("/login", { replace: true });
                    return;
                }

                setError(getApiErrorMessage(err, "Could not load profile."));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const setMessage = (message) => {
        setSuccess(message);
        setError("");
    };

    const handleLogout = () => {
        clearCachedProfile();
        clearAuthToken();
        navigate("/login");
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                name: form.name,
                email: form.email,
            };

            const data = await updateProfile(payload);

            if (data.token) {
                setAuthToken(data.token);
            }

            const nextProfile = storeCachedProfile(data.user);
            setProfile(nextProfile);
            setForm(profileToForm(nextProfile));
            setMessage("Profile updated.");
        } catch (err) {
            if (isUnauthorizedError(err)) {
                handleLogout();
                return;
            }

            setError(getApiErrorMessage(err, "Could not update profile."));
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        setError("");
        setSuccess("");

        try {
            const data = await updateProfileAvatar(file);
            const nextProfile = storeCachedProfile(data.user);
            setProfile(nextProfile);
            setForm(profileToForm(nextProfile));
            setMessage("Profile image updated.");
        } catch (err) {
            if (isUnauthorizedError(err)) {
                handleLogout();
                return;
            }

            setError(getApiErrorMessage(err, "Could not update image."));
        } finally {
            setUploadingAvatar(false);
            event.target.value = "";
        }
    };

    const handleRemoveAvatar = async () => {
        setUploadingAvatar(true);
        setError("");
        setSuccess("");

        try {
            const data = await deleteProfileAvatar();
            const nextProfile = storeCachedProfile(data.user);
            setProfile(nextProfile);
            setForm(profileToForm(nextProfile));
            setMessage("Profile image removed.");
        } catch (err) {
            if (isUnauthorizedError(err)) {
                handleLogout();
                return;
            }

            setError(getApiErrorMessage(err, "Could not remove image."));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleDeleteProfile = async () => {
        const confirmed = window.confirm(
            "Delete your profile? This will remove your account, CV files, and extracted data."
        );

        if (!confirmed) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            await deleteProfile();
            clearCachedProfile();
            clearAuthToken();
            navigate("/register");
        } catch (err) {
            if (isUnauthorizedError(err)) {
                handleLogout();
                return;
            }

            setError(getApiErrorMessage(err, "Could not delete profile."));
            setSaving(false);
        }
    };

    const avatar = profile?.avatarUrl;
    const initials = getInitials(profile?.name);

    return (
        <div className="relative z-[60]">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] py-1 pl-1 pr-3 text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08] hover:text-white"
                aria-label="Open profile menu"
            >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.07] text-xs font-bold text-zinc-100">
                    {avatar ? (
                        <img
                            src={avatar}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        initials
                    )}
                </span>
                <span className="hidden max-w-[8rem] truncate sm:inline">
                    {profile?.name || "Profile"}
                </span>
            </button>

            {open && (
                <div className="absolute right-0 top-14 z-[70] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-white/15 bg-[#101010]/95 shadow-[0_28px_90px_rgba(0,0,0,0.44)] backdrop-blur-xl">
                    <div className="h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
                    <div className="p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] text-sm font-bold text-zinc-100">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        initials
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-zinc-100">
                                        {profile?.name || "Profile"}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500">
                                        {profile?.email || "Loading..."}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
                                aria-label="Close profile menu"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                                <CheckCircle size={14} />
                                {success}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
                                <Loader2 size={16} className="animate-spin" />
                                Loading profile...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                />

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingAvatar}
                                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                                    >
                                        {uploadingAvatar ? (
                                            <Loader2 size={15} className="animate-spin" />
                                        ) : (
                                            <Camera size={15} />
                                        )}
                                        Change Image
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        disabled={uploadingAvatar || !avatar}
                                        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-zinc-300 transition hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-zinc-500">
                                        Name
                                    </span>
                                    <input
                                        value={form.name}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                name: event.target.value,
                                            }))
                                        }
                                        className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none transition hover:border-white/20 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/15"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-zinc-500">
                                        Email
                                    </span>
                                    <input
                                        value={form.email}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                email: event.target.value,
                                            }))
                                        }
                                        className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none transition hover:border-white/20 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/15"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f7f5ef] px-4 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                                >
                                    {saving ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <User size={16} />
                                    )}
                                    Save Profile
                                </button>

                                <div className="grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08]"
                                    >
                                        <LogOut size={15} />
                                        Logout
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteProfile}
                                        disabled={saving}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                                    >
                                        <Trash2 size={15} />
                                        Delete Profile
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfileMenu;
