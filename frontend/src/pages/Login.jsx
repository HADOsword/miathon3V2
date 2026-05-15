import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  FileCheck2,
  Lock,
  Mail,
  MessageSquareText,
} from "lucide-react";
import { getApiErrorMessage, setAuthToken } from "../api/client";
import { loginUser } from "../api/authApi";
import AuthInput from "../components/auth/AuthInput";
import AuthLayout from "../components/auth/AuthLayout";

const REMEMBERED_EMAIL_KEY = "cvmentor_remembered_email";

const loginHighlights = [
  {
    icon: FileCheck2,
    title: "Review your latest CV advice",
  },
  {
    icon: BrainCircuit,
    title: "Keep AI guidance in one place",
  },
  {
    icon: MessageSquareText,
    title: "Continue interview practice",
  },
];

const getRememberedEmail = () => {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || "/dashboard";
  const [formData, setFormData] = useState(() => ({
    email: getRememberedEmail(),
    password: "",
  }));
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(getRememberedEmail()));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credentials = {
        email: formData.email.trim(),
        password: formData.password,
      };
      const data = await loginUser(credentials);

      if (!data.token) {
        throw new Error("Login succeeded but no auth token was returned.");
      }

      setAuthToken(data.token);

      if (rememberEmail) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, credentials.email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      activeMode="login"  
      sideTitle="Your preparation stays organized."
      highlights={loginHighlights}
      visualVariant="login"
      footer={
        <>
          New to CVMentor AI?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#f7f5ef] underline decoration-white/30 underline-offset-4 transition hover:text-white hover:decoration-white"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <AuthInput
          id="login-email"
          label="Email address"
          icon={Mail}
          type="email"
          name="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          autoCapitalize="none"
          disabled={loading}
          required
        />

        <AuthInput
          id="login-password"
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          showPasswordToggle
          disabled={loading}
          required
        />

        <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-zinc-400">
          <span className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-white/[0.05] accent-[#f7f5ef]"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              disabled={loading}
            />
            Remember email
          </span>
          <span className="text-xs text-zinc-600">Private device only</span>
        </label>

        <button
          type="submit"
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f7f5ef] px-5 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_52px_rgba(245,245,240,0.28)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            "Signing in..."
          ) : (
            <>
              Sign in
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </>
          )}
        </button>

        <p className="text-center text-xs leading-5 text-zinc-500">
          Protected access to your CV feedback and interview prep workspace.
        </p>
      </form>
    </AuthLayout>
  );
}

export default Login;
