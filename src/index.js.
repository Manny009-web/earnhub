
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        success: true,
        service: "EarnHub API",
        message: "Backend is running"
      });
    }

    return env.ASSETS.fetch(request);
  }
};
