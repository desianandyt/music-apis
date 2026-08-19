export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Health check ya root route ke liye bina API Key ke access dein
    if (path === '/' || path === '/api/health') {
      return new Response(
        JSON.stringify({ success: true, message: "Anand's Music API is Online & Secure!" }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 2. Sabhi /api/ routes par Security & KV Check lagayein
    if (path.startsWith('/api/')) {
      const apiKey = request.headers.get('x-api-key');

      // Agar header mein API key nahi di hai
      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Missing API Key in headers" }),
          { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // Cloudflare KV (`USER_KEYS`) se check karein ki key valid hai ya nahi (0ms delay)
      const userId = await env.USER_KEYS.get(apiKey);
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden: Invalid or Expired API Key" }),
          { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // 3. Background mein Timestamp ke sath Node.js Backend ko usage report bhejein (Non-blocking)
      const exactTimestamp = new Date().toISOString();
      ctx.waitUntil(
        fetch("https://your-nodejs-backend.com/api/internal/track-usage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": env.INTERNAL_SECRET // 64-character secret key jo Cloudflare secrets mein hai
          },
          body: JSON.stringify({
            userId: userId,
            endpoint: path,
            requestedAt: exactTimestamp
          })
        }).catch(err => console.error("Background tracking failed:", err))
      );
    }

    // 4. Music API Search & Data Endpoints Handling
    try {
      const query = url.searchParams.get('query') || '';

      if (path === '/api/search/songs') {
        return handleSearchResponse('songs', query);
      } 
      else if (path === '/api/search/albums') {
        return handleSearchResponse('albums', query);
      }
      else if (path === '/api/search/artists') {
        return handleSearchResponse('artists', query);
      }
      else if (path === '/api/search/playlists') {
        return handleSearchResponse('playlists', query);
      }
      else if (path === '/api/search') {
        return handleSearchResponse('global', query);
      }

      // Agar route match na ho
      return new Response(
        JSON.stringify({ success: false, error: "Endpoint not found" }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );

    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
};

// Helper function for returning music search results
function handleSearchResponse(type: string, query: string): Response {
  const mockData = {
    success: true,
    type: type,
    query: query,
    results: [
      { id: "1", title: `${query} - Sample Track`, artist: "Artist Name", url: "https://example.com/stream.mp3" }
    ]
  };

  return new Response(
    JSON.stringify(mockData),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}
