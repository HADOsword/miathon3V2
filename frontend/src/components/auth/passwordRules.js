const passwordRules = [
  {
    label: "At least 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    label: "Upper and lower case letters",
    test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  {
    label: "A number or symbol",
    test: (value) => /[\d\W_]/.test(value),
  },
];

export function getPasswordChecks(password) {
  return passwordRules.map((rule) => ({
    label: rule.label,
    passed: rule.test(password),
  }));
}
