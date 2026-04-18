import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin to handle /api/storage/* endpoints
function storageApiPlugin(): Plugin {
  return {
    name: 'storage-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/storage/')) {
          const filename = req.url.replace('/api/storage/', '');

          // Security check: allow only alphanumeric and .json
          if (!/^[a-zA-Z0-9_-]+\.json$/.test(filename)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid filename' }));
            return;
          }

          const filePath = path.resolve(__dirname, 'data', filename);

          if (req.method === 'GET') {
            try {
              const data = await fs.promises.readFile(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } catch (e: unknown) {
              if (e instanceof Error && (e as Error & { code?: string }).code === 'ENOENT') {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'File not found' }));
              } else {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Read error' }));
              }
            }
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                JSON.parse(body); // Validate JSON
                // Ensure data directory exists
                const dataDir = path.resolve(__dirname, 'data');
                try {
                  await fs.promises.access(dataDir);
                } catch {
                  await fs.promises.mkdir(dataDir, { recursive: true });
                }

                await fs.promises.writeFile(filePath, body);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Write error' }));
              }
            });
          } else {
            next();
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/data/**'], // Don't watch data folder to prevent infinite reload
      },
    },
    plugins: [react(), storageApiPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
