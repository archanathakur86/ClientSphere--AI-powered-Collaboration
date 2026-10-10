// Single source of truth for password strength on the server.
// The frontend keeps an identical copy in src/utils/passwordPolicy.js for live feedback.
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    message: "Password must be at least 8 characters",
    test: (p) => p.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter (A-Z)",
    message: "Password must contain at least one uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "One lowercase letter (a-z)",
    message: "Password must contain at least one lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "One number (0-9)",
    message: "Password must contain at least one number",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "One special character (! @ # $ % ...)",
    message: "Password must contain at least one special character",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

// Returns the first failing rule's message, or null when the password is strong enough.
export function getPasswordError(password) {
  if (typeof password !== "string" || password.length === 0) return "Password is required";
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  const failed = PASSWORD_RULES.find((r) => !r.test(password));
  return failed ? failed.message : null;
}