import fs, { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';

import { bootstrap } from './account-db';
import * as accountApp from './app-account';
import * as adminApp from './app-admin';
import * as corsApp from './app-cors-proxy';
import * as openidApp from './app-openid';
import * as plaidApp from './app-plaid/app-plaid';
import * as secretApp from './app-secrets';
import * as syncApp from './app-sync';
import { config } from './load-config';

const app = express();

process.on('unhandledRejection', reason => {
  console.log('Rejection:', reason);
});

app.disable('x-powered-by');
app.use(cors());
app.set('trust proxy', config.get('trustedProxies'));
if (process.env.NODE_ENV !== 'development') {
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 500,
      legacyHeaders: false,
      standardHeaders: true,
    }),
  );
}

app.use(express.json({ limit: `${config.get('upload.fileSizeLimitMB')}mb` }));

app.use(
  express.raw({
    type: 'application/actual-sync',
    limit: `${config.get('upload.fileSizeSyncLimitMB')}mb`,
  }),
);

app.use(
  express.raw({
    type: 'application/encrypted-file',
    limit: `${config.get('upload.syncEncryptedFileSizeLimitMB')}mb`,
  }),
);

app.use('/sync', syncApp.handlers);
app.use('/account', accountApp.handlers);
app.use('/plaid', plaidApp.handlers);
app.use('/secret', secretApp.handlers);

if (config.get('corsProxy.enabled')) {
  app.use('/cors-proxy', corsApp.handlers);
}

app.use('/admin', adminApp.handlers);
app.use('/openid', openidApp.handlers);

app.get('/mode', (req, res) => {
  res.send(config.get('mode'));
});

app.get('/info', (_req, res) => {
  function findPackageJson(startDir: string) {
    // find the nearest package.json file while traversing up the directory tree
    let currentPath = startDir;
    let directoriesSearched = 0;
    const pathRoot = resolve(currentPath, '/');
    try {
      while (currentPath !== pathRoot && directoriesSearched < 5) {
        const packageJsonPath = resolve(currentPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            readFileSync(packageJsonPath, 'utf-8'),
          );

          if (packageJson.name === '@actual-app/sync-server') {
            return packageJson;
          }
        }

        currentPath = resolve(join(currentPath, '..')); // Move up one directory
        directoriesSearched++;
      }
    } catch (error) {
      console.error('Error while searching for package.json:', error);
    }

    return null;
  }

  const dirname = resolve(fileURLToPath(import.meta.url), '../');
  const packageJson = findPackageJson(dirname);

  res.status(200).json({
    build: {
      name: packageJson?.name,
      description: packageJson?.description,
      version: packageJson?.version,
    },
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/metrics', (_req, res) => {
  res.status(200).json({
    mem: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

app.get('/plaid-link-helper', (_req, res) => {
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'unsafe-inline' https://cdn.plaid.com; style-src 'unsafe-inline'; img-src 'self' data: https:; connect-src https:; frame-src https:; child-src https:; form-action https:;",
  );
  res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Connect Plaid</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #222;
      }
    </style>
  </head>
  <body>
    <div id="status">Opening Plaid...</div>
    <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
    <script>
      (function () {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const token = hash.get('token');
        const targetOrigin = hash.get('origin') || window.location.origin;
        const sessionId = hash.get('sessionId');
        const status = document.getElementById('status');

        function notify(message) {
          if (sessionId) {
            localStorage.setItem(
              'actual:plaid-link:' + sessionId,
              JSON.stringify(
                Object.assign({ type: 'actual:plaid-link' }, message),
              ),
            );
          }

          if (window.opener) {
            window.opener.postMessage(
              Object.assign({ type: 'actual:plaid-link' }, message),
              targetOrigin,
            );
          }
        }

        function fail(message) {
          status.textContent = message;
          notify({ status: 'error', error: { error_message: message } });
        }

        if (!token) {
          fail('Missing Plaid link token.');
          return;
        }

        window.addEventListener('load', function () {
          if (!window.Plaid) {
            fail('Plaid Link failed to load.');
            return;
          }

          const handler = window.Plaid.create({
            token,
            onSuccess: function (publicToken, metadata) {
              notify({
                status: 'success',
                publicToken,
                metadata,
              });
              window.close();
            },
            onExit: function (error, metadata) {
              notify({
                status: error ? 'error' : 'exit',
                error,
                metadata,
              });
              if (!error) {
                window.close();
              }
            },
          });

          handler.open();
        });
      })();
    </script>
  </body>
</html>`);
});

// The web frontend
app.use((req, res, next) => {
  res.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.set('Cross-Origin-Embedder-Policy', 'require-corp');
  res.set(
    'Content-Security-Policy',
    "default-src 'self' blob:; img-src 'self' blob: data:; script-src 'self' 'unsafe-eval' blob: https://cdn.plaid.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src http: https:; frame-src https://*.plaid.com;",
  );
  next();
});
if (process.env.NODE_ENV === 'development') {
  console.log(
    'Running in development mode - Proxying frontend routes to React Dev Server',
  );

  // Imported within Dev block to allow dev dependency in package.json (reduces package size in production)
  const httpProxyMiddleware = await import('http-proxy-middleware');

  app.use(
    httpProxyMiddleware.createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      ws: true,
    }),
  );
} else {
  console.log('Running in production mode - Serving static React app');

  app.use(express.static(config.get('webRoot'), { index: false }));
  app.get('/{*splat}', (req, res) =>
    res.sendFile('index.html', { root: config.get('webRoot') }),
  );
}

function parseHTTPSConfig(value: string) {
  if (value.startsWith('-----BEGIN')) {
    return value;
  }
  return fs.readFileSync(value);
}

function sendServerStartedMessage() {
  // Signify to any parent process that the server has started. Used in electron desktop app
  // oxlint-disable-next-line typescript/ban-ts-comment
  // @ts-ignore-error electron types
  process.parentPort?.postMessage({ type: 'server-started' });
  console.log(
    'Listening on ' + config.get('hostname') + ':' + config.get('port') + '...',
  );
}

export async function run() {
  const portVal = config.get('port');
  const port = typeof portVal === 'string' ? parseInt(portVal) : portVal;
  const hostname = config.get('hostname');
  const openIdConfig = config?.getProperties()?.openId;
  if (
    openIdConfig?.discoveryURL ||
    openIdConfig?.issuer?.authorization_endpoint
  ) {
    console.log('OpenID configuration found. Preparing server to use it');
    try {
      const result = await bootstrap({ openId: openIdConfig }, true);
      if ('error' in result && result.error) {
        console.log(result.error);
      } else {
        console.log('OpenID configured!');
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (config.get('https.key') && config.get('https.cert')) {
    const https = await import('node:https');
    const httpsOptions = {
      ...config.get('https'),
      key: parseHTTPSConfig(config.get('https.key')),
      cert: parseHTTPSConfig(config.get('https.cert')),
    };
    https.createServer(httpsOptions, app).listen(port, hostname, () => {
      sendServerStartedMessage();
    });
  } else {
    app.listen(port, hostname, () => {
      sendServerStartedMessage();
    });
  }
}
