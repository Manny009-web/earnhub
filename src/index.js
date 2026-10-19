
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      };

      if (!env.DB) {
        return Response.json(
          { success: false, error: "Database binding DB is missing" },
          { status: 500, headers }
        );
      }

      try {
        if (url.pathname === "/api/health" && request.method === "GET") {
          await env.DB.prepare("SELECT 1 AS ok").first();

          return Response.json({
            success: true,
            service: "EarnHub API",
            database: "connected"
          }, { headers });
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

        return Response.json(
          { success: false, error: "API endpoint not found" },
          { status: 404, headers }
        );
      } catch (error) {
        return Response.json(
          { success: false, error: "Database request failed" },
          { status: 500, headers }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
