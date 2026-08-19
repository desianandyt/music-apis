import { Hono } from 'hono'

export const Home = new Hono()

Home.get('/', (c) => {
  const title = "Anand's Music API"
  const description = 'High-performance, ad-free music streaming API powered by Cloudflare.'

  return c.html(
    <html lang="en">
      <head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="utf-8" />
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        
        {/* Tailwind CSS */}
        <script src="https://cdn.tailwindcss.com" />
        
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Apple Style Typography */
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, sans-serif;
                background-color: #050505;
                color: #ffffff;
                margin: 0;
                overflow-x: hidden;
            }

            /* Complex Animated Background */
            .bg-mesh {
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.15), transparent 25%),
                            radial-gradient(circle at 85% 30%, rgba(217, 70, 239, 0.15), transparent 25%),
                            radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.15), transparent 25%);
                z-index: -2;
            }

            /* Glassmorphism Classes */
            .apple-glass {
                background: rgba(25, 25, 30, 0.4);
                backdrop-filter: blur(40px);
                -webkit-backdrop-filter: blur(40px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);
            }

            .apple-glass-card {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            
            .apple-glass-card:hover {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.15);
                transform: translateY(-5px);
            }

            /* Floating Animation for Blobs */
            @keyframes float {
                0%, 100% { transform: translateY(0px) scale(1); }
                50% { transform: translateY(-20px) scale(1.05); }
            }
            .animate-float { animation: float 6s ease-in-out infinite; }
            
            /* Text Gradient */
            .text-gradient {
                background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            `
          }}
        />
      </head>
      
      <body class="min-h-screen w-full relative pb-10">
        
        {/* Background Mesh & Blobs */}
        <div class="bg-mesh" />
        <div class="absolute top-20 left-10 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-float z-[-1]" />
        <div class="absolute bottom-20 right-10 w-96 h-96 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-float z-[-1]" style={{ animationDelay: '3s' }} />

        {/* Main Container */}
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
            
            {/* Header / Hero Section */}
            <main class="apple-glass rounded-[2.5rem] p-8 md:p-16 text-center relative z-10 flex flex-col items-center mb-10 overflow-hidden">
                
                {/* Status Badge */}
                <div class="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    API is Online & Operational
                </div>

                {/* App Icon */}
                <div class="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl flex items-center justify-center mb-8 border border-white/20 transform transition hover:scale-105 duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 md:h-14 md:w-14 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                </div>

                {/* Main Titles */}
                <h1 class="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-gradient">Anand's Music API</h1>
                <p class="text-gray-400 text-base md:text-xl font-medium mb-10 max-w-2xl leading-relaxed">
                    A lightning-fast, highly scalable, and completely ad-free music streaming backend. Built for developers to integrate seamless audio experiences.
                </p>

                {/* Action Buttons */}
                <div class="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <a href="/docs" class="bg-white text-black font-semibold text-lg py-4 px-8 rounded-full inline-flex items-center justify-center gap-2 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300">
                        Explore Documentation
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </a>
                </div>
            </main>

            {/* Features Grid */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                
                {/* Feature 1 */}
                <div class="apple-glass-card rounded-3xl p-8 flex flex-col items-start">
                    <div class="p-3 bg-blue-500/20 text-blue-400 rounded-2xl mb-5">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">Lightning Fast</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">Hosted on Cloudflare's Edge network, delivering audio streams with zero latency across the globe.</p>
                </div>

                {/* Feature 2 */}
                <div class="apple-glass-card rounded-3xl p-8 flex flex-col items-start">
                    <div class="p-3 bg-purple-500/20 text-purple-400 rounded-2xl mb-5">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">320kbps Audio</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">Direct MP4/MP3 streaming links in high-fidelity 320kbps format. Get album art, lyrics, and metadata.</p>
                </div>

                {/* Feature 3 */}
                <div class="apple-glass-card rounded-3xl p-8 flex flex-col items-start">
                    <div class="p-3 bg-pink-500/20 text-pink-400 rounded-2xl mb-5">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">100% Ad-Free</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">No commercial interruptions. Seamless API integration designed specifically for clean app development.</p>
                </div>

            </div>

            {/* Footer */}
            <div class="text-center">
                <p class="text-sm text-gray-500 font-medium tracking-widest uppercase mb-2">
                    Engineered for Developers
                </p>
                <p class="text-gray-600 text-xs">
                    Built by <span class="text-gray-300 font-semibold">Anand Sharma</span> • Powered by Cloudflare Workers
                </p>
            </div>

        </div>
      </body>
    </html>
  )
})