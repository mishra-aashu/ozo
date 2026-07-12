import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import url from 'url'

// Custom local API handler plugin to run Vercel Serverless Functions in Vite
const localApiPlugin = () => ({
  name: 'vite-plugin-local-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const parsedUrl = url.parse(req.url, true);
      let pathname = parsedUrl.pathname;
      let query = { ...parsedUrl.query };

      // Apply vercel.json rewrites for local development
      if (pathname.startsWith('/api/proxy/')) {
        pathname = '/api/proxy';
      } else if (pathname === '/sitemap.xml') {
        pathname = '/api/sitemap-index';
      } else if (pathname === '/sitemap-static.xml') {
        pathname = '/api/sitemap-static';
      } else if (pathname.startsWith('/sitemap-') && pathname.endsWith('.xml')) {
        const city = pathname.slice('/sitemap-'.length, -'.xml'.length);
        pathname = '/api/sitemap-city';
        query.city = city;
      } else if (pathname.startsWith('/api/sitemap-') && pathname.endsWith('.xml')) {
        const city = pathname.slice('/api/sitemap-'.length, -'.xml'.length);
        pathname = '/api/sitemap-city';
        query.city = city;
      } else if (pathname.match(/^\/[a-zA-Z0-9]{32}\.txt$/)) {
        const key = pathname.slice(1, -4);
        pathname = '/api/indexnow-key';
        query.key = key;
      } else if (pathname.startsWith('/product-images/') && pathname.endsWith('.png')) {
        const slug = pathname.slice('/product-images/'.length, -'.png'.length);
        pathname = '/api/product-image';
        query.slug = slug;
      }

      if (pathname.startsWith('/api/')) {
        const apiName = pathname.replace(/^\/api\//, '');
        if (!apiName || apiName.startsWith('_')) {
          next();
          return;
        }

        const possibleExtensions = ['.ts', '.js'];
        let apiFilePath = '';
        for (const ext of possibleExtensions) {
          const checkPath = path.join(process.cwd(), 'api', `${apiName}${ext}`);
          if (fs.existsSync(checkPath)) {
            apiFilePath = checkPath;
            break;
          }
        }

        if (!apiFilePath) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `API route ${pathname} not found` }));
          return;
        }

        try {
          // Parse request body if any
          let body = {};
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const data = Buffer.concat(buffers).toString();
            if (req.headers['content-type']?.includes('application/json') && data.trim()) {
              try {
                body = JSON.parse(data);
              } catch (e) {
                body = data;
              }
            } else {
              body = data;
            }
          }

          // Mock req extensions for Vercel Serverless
          req.query = query;
          req.body = body;
          req.cookies = {}; // mock cookies

          // Mock res extensions for Vercel Serverless
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(data));
            return res;
          };
          res.send = (data) => {
            if (Buffer.isBuffer(data)) {
              res.end(data);
              return res;
            }
            if (typeof data === 'object') {
              return res.json(data);
            }
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'text/html');
            }
            res.end(data);
            return res;
          };

          // Load the module using Vite's SSR module loader (enables TS execution!)
          const apiModule = await server.ssrLoadModule(apiFilePath);
          if (typeof apiModule.default === 'function') {
            await apiModule.default(req, res);
          } else {
            throw new Error(`API route ${pathname} does not export default function`);
          }
        } catch (err) {
          console.error(`Error executing API ${pathname}:`, err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          }
        }
      } else {
        next();
      }
    });
  }
})

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    base: '/',
    plugins: [react(), localApiPlugin()],
    esbuild: {
      pure: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : []
    },
    server: {
      port: 3000,
      open: true,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            animations: ['framer-motion'],
            ui: ['lucide-react', 'react-hot-toast'],
            maplibre: ['maplibre-gl'],
            leaflet: ['leaflet', 'react-leaflet'],
            sentry: ['@sentry/react'],
            swiper: ['swiper'],
            datefns: ['date-fns']
          }
        }
      }
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@pages': '/src/pages',
        '@hooks': '/src/hooks',
        '@utils': '/src/utils',
        '@stores': '/src/stores',
        '@lib': '/src/lib',
        '@assets': '/src/assets'
      }
    }
  }
})