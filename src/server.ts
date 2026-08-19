import { App } from './app'; // Bade 'A' ke sath import (TypeScript error fixed!)

// --- DYNAMIC APP INITIALIZER ---
// Yeh automatically detect karega ki aapka music app kis format mein export hua hai
const anyApp: any = App;
const appInstance = typeof anyApp === 'function' ? new anyApp() : anyApp;
const musicHonoApp = appInstance.fetch ? appInstance : (appInstance.app || appInstance.getApp());

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // 1. Root route aur health check ko bina API Key ke access karne dein
      if (path === '/' || path === '/api/health') {
        return await musicHonoApp.fetch(request, env, ctx);
      }

      // 2. Sabhi /api/ routes par Security aur KV Check lagayein
      if (path.startsWith('/api/')) {
        const apiKey = request.headers.get('x-api-key');

        // Agar header mein API key missing hai
        if (!apiKey) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized: Missing API Key in headers" }),
            { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // CRASH PREVENTER: Check karein ki KV 'USER_KEYS' Cloudflare mein bind hai ya nahi
        if (!env.USER_KEYS) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "System Error: KV Namespace 'USER_KEYS' is not bound. Please check Cloudflare Dashboard." 
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // 3. Cloudflare KV se check karein ki key valid hai ya nahi (0ms delay)
        const userId = await env.USER_KEYS.get(apiKey);
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: "Forbidden: Invalid or Expired API Key" }),
            { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // 4. Background mein Timestamp ke sath Node.js Backend ko usage report bhejein (Non-blocking)
        const exactTimestamp = new Date().toISOString();
        const internalSecret = env.INTERNAL_SECRET || "MISSING_SECRET_KEY";

        ctx.waitUntil(
          fetch("https://your-nodejs-backend.com/api/internal/track-usage", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": internalSecret
            },
            body: JSON.stringify({
              userId: userId,
              endpoint: path,
              requestedAt: exactTimestamp
            })
          }).catch(err => console.error("Tracking Failed:", err))
        );
      }

      // 5. Agar Security Check Pass ho gaya, toh request aapke ASLI Music App par jayegi
      return await musicHonoApp.fetch(request, env, ctx);

    } catch (error: any) {
      // 6. AGAR KUCH BHI FAIL HUA TOH EXACT REASON DIKHEGA
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Worker Exception Caught", 
          details: error.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
};

