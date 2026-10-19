
import { hashPassword, makeId, jsonError } from "./auth.js";

const headers = {
 const headers = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
  return new Response(null, {
    status: 204,
    headers
  });
}
    if (url.pathname.startsWith("/api/")) {
      if (!env.DB) {
        return jsonError("Database binding DB is missing", 500);
      }

      try {
        if (url.pathname === "/api/health" && request.method === "GET") {
          await env.DB.prepare("SELECT 1").first();
          return Response.json({
            success: true,
            service: "EarnHub API",
            database: "connected"
          }, { headers });
        }

        if (url.pathname === "/api/register" && request.method === "POST") {
          const body = await request.json().catch(() => null);

          if (
            !body ||
            typeof body.fullName !== "string" ||
            typeof body.email !== "string" ||
            typeof body.password !== "string"
          ) {
            return jsonError("Enter your name, email and password.");
          }

          const fullName = body.fullName.trim();
          const email = body.email.trim().toLowerCase();
          const password = body.password;

          if (fullName.length < 2 || fullName.length > 100) {
            return jsonError("Name must be between 2 and 100 characters.");
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return jsonError("Enter a valid email address.");
          }

          if (password.length < 12 || password.length > 128) {
            return jsonError("Password must be 12–128 characters.");
          }

          const existing = await env.DB.prepare(
            "SELECT id FROM users WHERE email = ?"
          ).bind(email).first();

          if (existing) {
            return jsonError("An account with this email already exists.", 409);
          }

          const id = makeId();
          const salt = toSafeSalt();
          const passwordHash = await hashPassword(password, salt);

          await env.DB.prepare(`
            INSERT INTO users (id, full_name, email, password_hash, role)
            VALUES (?, ?, ?, ?, 'user')
          `).bind(id, fullName, email, `${salt}:${passwordHash}`).run();

          return Response.json({
            success: true,
            message: "Account created. Login sessions are not yet enabled.",
            user: { id, fullName, email }
          }, { status: 201, headers });
        }

        if (url.pathname === "/api/login") {
          return jsonError(
            "Login is not enabled until secure session handling is implemented.",
            501
          );
        }

        if (url.pathname === "/api/tasks" && request.method === "GET") {
          const result = await env.DB.prepare(`
            SELECT id, title, description, reward_kobo, created_at
            FROM tasks
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 100
          `).all();

          return Response.json({
            success: true,
            tasks: result.results
          }, { headers });
        }

        return jsonError("API endpoint not found.", 404);
      } catch {
        return jsonError("Request failed. Check the database schema and deployment.", 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

function toSafeSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
