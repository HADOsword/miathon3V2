import { Check, Circle } from "lucide-react";
import { getPasswordChecks } from "./passwordRules";

const strengthLabels = ["Too short", "Getting there", "Good", "Strong"];

function PasswordStrength({ password }) {
  const checks = getPasswordChecks(password);
  const score = checks.filter((check) => check.passed).length;
  const percent = password.length === 0 ? 0 : Math.max(20, (score / checks.length) * 100);
  const label = password.length === 0 ? "Add a password" : strengthLabels[score];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-zinc-400">Password strength</p>
        <p className="text-xs font-semibold text-zinc-200">{label}</p>
      </div>

      <div className="h-1.5 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-zinc-500 via-amber-200 to-[#f7f5ef] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 grid gap-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-xs text-zinc-400">
            {check.passed ? (
              <Check size={14} className="text-amber-200" />
            ) : (
              <Circle size={14} className="text-zinc-600" />
            )}
            <span className={check.passed ? "text-zinc-200" : undefined}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordStrength;
