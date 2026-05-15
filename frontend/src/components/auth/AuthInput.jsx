import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function AuthInput({
  id,
  label,
  icon: Icon,
  type = "text",
  showPasswordToggle = false,
  hint,
  error,
  className = "",
  ...inputProps
}) {
  const [isVisible, setIsVisible] = useState(false);
  const inputType = showPasswordToggle && type === "password" && isVisible ? "text" : type;
  const descriptionId = hint || error ? `${id}-description` : undefined;
  const inputStateClass = error
    ? "border-amber-400/45 focus:border-amber-300 focus:ring-amber-400/15"
    : "border-white/10 focus:border-white/35 focus:ring-white/10";

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-200">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        )}

        <input
          id={id}
          type={inputType}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={descriptionId}
          className={`h-12 w-full rounded-xl border bg-white/[0.045] py-3 text-sm text-[#f7f5ef] outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:bg-white/[0.07] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${inputStateClass} ${
            Icon ? "pl-11" : "pl-4"
          } ${showPasswordToggle ? "pr-12" : "pr-4"}`}
          {...inputProps}
        />

        {showPasswordToggle && (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            onClick={() => setIsVisible((value) => !value)}
            aria-label={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {(hint || error) && (
        <p
          id={descriptionId}
          className={`text-xs leading-5 ${error ? "text-amber-200" : "text-zinc-500"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export default AuthInput;
