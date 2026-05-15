import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  Mail,
  SearchCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getApiErrorMessage } from "../api/client";
import { registerUser } from "../api/authApi";
import AuthInput from "../components/auth/AuthInput";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordStrength from "../components/auth/PasswordStrength";
import { getPasswordChecks } from "../components/auth/passwordRules";

const registerHighlights = [
  {
    icon: FileText,
    title: "Start from the CV you have",
    description: "Create your workspace and begin with your current document.",
  },
  {
    icon: SearchCheck,
    title: "Find sharper improvements",
    description: "Get focused suggestions for clarity, structure, and impact.",
  },
  {
    icon: Sparkles,
    title: "Practice with specific prompts",
    description: "Prepare using questions generated from your own experience.",
  },
];

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const passwordChecks = getPasswordChecks(formData.password);
    const hasMinimumPassword = passwordChecks[0].passed;

    if (!hasMinimumPassword) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      setSuccess("Account created successfully. Taking you to login...");
      setTimeout(() => navigate("/login", { replace: true }), 1000);
    } catch (err) {
      setError(getApiErrorMessage(err, "Register failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      activeMode="register"
      sideTitle="One account for the full preparation flow."
      highlights={registerHighlights}
      visualVariant="register"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#f7f5ef] underline decoration-white/30 underline-offset-4 transition hover:text-white hover:decoration-white"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleRegister} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <AuthInput
          id="register-username"
          label="Username"
          icon={UserRound}
          type="text"
          name="username"
          placeholder="johndoe"
          value={formData.username}
          onChange={handleChange}
          autoComplete="username"
          autoCapitalize="none"
          disabled={loading}
          required
        />

        <AuthInput
          id="register-email"
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
          id="register-password"
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          placeholder="Create a password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          showPasswordToggle
          hint="Use at least 8 characters."
          disabled={loading}
          minLength={8}
          required
        />

        {formData.password && <PasswordStrength password={formData.password} />}

        <button
          type="submit"
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f7f5ef] px-5 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_52px_rgba(245,245,240,0.28)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            "Creating account..."
          ) : (
            <>
              Create account
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Register;
