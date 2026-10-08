// Runs BEFORE any test file is loaded (jest "setupFiles").
// ES-module imports are hoisted above normal code, so environment variables set inside the
// test file itself arrive too late. Setting them here guarantees:
//  - the real .env (Atlas, Groq, Cloudinary, SMTP, Stripe) is never used by tests
//    (dotenv does not override variables that are already set)
//  - no real emails are sent and no real payments are attempted
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "testsecret123";
process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:1/never-used-in-tests";
process.env.GROQ_API_KEY = "dummy_groq";
process.env.CLOUDINARY_CLOUD_NAME = "dummy_cloud";
process.env.CLOUDINARY_API_KEY = "dummy_key";
process.env.CLOUDINARY_API_SECRET = "dummy_secret";
process.env.CLIENT_URL = "http://localhost:5173";
for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) {
  process.env[key] = "";
}