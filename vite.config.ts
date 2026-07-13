import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Injects a strict Content-Security-Policy meta tag into the production build only.
// Vite's dev server relies on inline/eval'd scripts for HMR, which a strict CSP would
// break — this plugin is a no-op in `vite dev` and only rewrites index.html on `vite build`.
function cspPlugin(supabaseUrl: string): Plugin {
  const supabaseOrigin = (() => {
    try {
      return supabaseUrl ? new URL(supabaseUrl).origin : 'https://*.supabase.co'
    } catch {
      return 'https://*.supabase.co'
    }
  })()

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Recharts/SVG inline styles
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin} wss://${new URL(supabaseOrigin).host}`,
    `frame-src ${supabaseOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'inject-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `    <meta http-equiv="Content-Security-Policy" content="${csp}">\n  </head>`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // Relative base so the build works under any GitHub Pages project subpath
    // (e.g. https://<user>.github.io/<repo>/) without hardcoding the repo name.
    base: './',
    plugins: [react(), tailwindcss(), cspPlugin(env.VITE_SUPABASE_URL ?? '')],
  }
})
