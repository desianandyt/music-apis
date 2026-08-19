import { Hono } from 'hono'

export const Home = new Hono()

Home.get('/', (c) => {
  const title = "Anand's Music API"
  const description = 'High-performance, ad-free music streaming API by Anand Sharma'

  return c.html(
    <html lang="en">
      <head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="utf-8" />
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        
        {/* Tailwind CSS */}
        <script src="https://cdn.tailwindcss.com" />
        
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Apple Style Default Font */
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #000;
                margin: 0;
                overflow: hidden;
            }

            /* Animated Background Gradients to make Glass UI pop */
            .bg-mesh {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
                            radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%),
                            radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.15) 0px, transparent 50%),
                            radial-gradient(at 0% 100%, rgba(59, 130, 246, 0.15) 0px, transparent 50%);
                z-index: -1;
            }

            /* Apple Glass UI Effect */
            .apple-glass {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
            }
            
            /* Smooth hover animation for button */
            .apple-button {
                transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .apple-button:hover {
                transform: scale(1.03);
                box-shadow: 0 0 25px rgba(255, 255, 255, 0.4);
            }

            /* Simple Pulse Animation for Background Blobs */
            @keyframes softPulse {
                0%, 100% { opacity: 0.4; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.05); }
            }
            .animate-soft-pulse {
                animation: softPulse 4s ease-in-out infinite;
            }`
          }}
        />
      </head>
      
      <body class="h-screen w-screen flex flex-col items-center justify-center text-white p-4">
        
        {/* Background Color Mesh */}
        <div class="bg-mesh" />

        {/* Background Animated Blobs */}
        <div class="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] animate-soft-pulse" />
        <div 
          class="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] animate-soft-pulse" 
          style={{ animationDelay: '2s' }} 
        />

        {/* Main Glass Panel */}
        <main class="apple-glass rounded-3xl p-10 md:p-14 max-w-md w-full text-center relative z-10 flex flex-col items-center">
            
            {/* Premium App Icon */}
            <div class="w-24 h-24 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-[28px] shadow-2xl flex items-center justify-center mb-8 border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
            </div>

            {/* Branding Details */}
            <h1 class="text-3xl font-semibold tracking-tight text-white mb-2">Anand's API</h1>
            <p class="text-gray-400 text-sm md:text-base font-medium mb-10 tracking-wide">
                Next-Gen Audio Streaming Engine
            </p>

            {/* /docs Button */}
            <a href="/docs" class="apple-button w-full bg-white text-black font-semibold text-lg py-3.5 px-6 rounded-full inline-flex items-center justify-center gap-2">
                <span>View Documentation</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </a>
        </main>

        {/* Footer */}
        <div class="absolute bottom-6 text-xs text-gray-500 font-medium tracking-widest uppercase text-center w-full z-10">
            Built by Anand Sharma
        </div>

      </body>
    </html>
  )
})