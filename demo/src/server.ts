// Load .env BEFORE any route module so env-var overrides (e.g. DEMO_PRIVATE_KEY)
// are visible at module-evaluation time.
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, Router } from 'express';
import cors from 'cors';
import path from 'path';
import { ActionGridView, YeriaApp } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from './security/demo-keys';
import { buildYeriaAuthMiddleware } from './security/auth';

// Routes
import formsRouter from './routes/forms';
import readersRouter from './routes/readers';
import actionsRouter from './routes/actions';
import actionGridRouter from './routes/action-grid';
import qrRouter from './routes/qr';
import messagesRouter from './routes/messages';
import secureRouter from './routes/secure';
import cardsRouter from './routes/cards';
import carouselsRouter from './routes/carousels';
import timelinesRouter from './routes/timelines';
import mediaRouter from './routes/media';
import mapsRouter from './routes/maps';
import notificationsRouter from './routes/notifications';

const app: Application = express();
const PORT = parseInt(process.env.PORT || '8051', 10);

// BASE_PATH lets the demo run behind a reverse proxy at e.g. /apps/demo.
// Strip any trailing slash; an empty value means "mount at root".
//
// IMPORTANT: BASE_PATH governs *Express route mounting only*. URLs returned in
// SDK payloads (action codes, submit URLs, etc.) must NOT include BASE_PATH —
// the mobile renderer prepends the service base URL itself, so any prefix
// embedded in the response double-prefixes (e.g. /apps/demo/apps/demo/...).
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static — served under BASE_PATH so /apps/demo/foo.png resolves correctly.
app.use(BASE_PATH || '/', express.static(path.join(__dirname, '../public')));

// All demo routes live under a sub-router so BASE_PATH applies uniformly.
const demo = Router();

// ── Auth gate ─────────────────────────────────────────────────────────
// Every demo route requires a valid Yeria-issued user token. The mobile
// renderer attaches `Authorization: Bearer <token>` on each request to the
// service base; the middleware verifies signature + kid against Yeria's
// public registry, enforces aud='yeria' / iss='yeria' / exp, and 401s
// otherwise. The /health endpoint stays open because it's mounted outside
// this router for container probes.
const YERIA_BASE_URL = (process.env.YERIA_BASE_URL || '').trim();
if (!YERIA_BASE_URL) {
  // Fail fast at boot rather than letting unauthenticated requests through
  // because the middleware couldn't be wired. A misconfigured deploy is a
  // misconfigured deploy — better an unhealthy container than an open one.
  throw new Error(
    '[yeria-demo] YERIA_BASE_URL is required (e.g. https://yeria.app) — ' +
    'the demo refuses to start without a Yeria registry it can verify ' +
    'incoming user tokens against.'
  );
}
demo.use(buildYeriaAuthMiddleware({ yeriaBaseUrl: YERIA_BASE_URL }));

// Iconify Material Symbols icons — one consistent SVG per SDK view. Served
// from Iconify's stable CDN; no bundling, scales to any density.
const ICON = (name: string) =>
  `https://api.iconify.design/material-symbols/${name}.svg?color=%23667eea&width=128`;

// YeriaApp instance for the home grid. Every payload the renderer consumes
// must be signed — the home view is no exception.
const homeApp = new YeriaApp({
  appId: 'demo-app-home',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey,
});

// Home — ActionGridView linking every demo route. Action codes are paths
// RELATIVE to the demo's service root (no BASE_PATH baked in); the mobile
// renderer composes them against the service base it already knows.
demo.get('/', (req: Request, res: Response) => {
  const grid = new ActionGridView('home', 'Yeria SDK — Tous les Types de Vues');
  grid.setColumns(3);
  grid.setSpacing(16);
  grid.addAction('/api/forms',         'FormView',         'Formulaires interactifs avec validation et divers types de champs', ICON('edit-document-outline'));
  grid.addAction('/api/readers',       'ReaderView',       'Affichage de contenu riche avec plusieurs types d\'éléments',       ICON('menu-book-outline'));
  grid.addAction('/api/cards',         'CardView',         'Vue fiche produit compacte avec statistiques et actions',           ICON('credit-card-outline'));
  grid.addAction('/api/actions',       'ActionListView',   'Liste verticale d\'éléments actionnables avec icônes',              ICON('list-alt-outline'));
  grid.addAction('/api/action-grid',   'ActionGridView',   'Disposition en grille d\'éléments actionnables',                    ICON('apps'));
  grid.addAction('/api/carousels',     'CarouselView',     'Affichage diaporama pour images et contenu',                        ICON('view-carousel-outline'));
  grid.addAction('/api/timelines',     'TimelineView',     'Affichage chronologique des événements',                            ICON('timeline'));
  grid.addAction('/api/messages',      'MessageView',      'Afficher des messages et notifications',                            ICON('chat-bubble-outline'));
  grid.addAction('/api/qr',            'QR Views',         'Scan et affichage de codes QR',                                     ICON('qr-code-scanner'));
  grid.addAction('/api/media',         'MediaView',        'Lecteur vidéo et audio avec contrôles',                             ICON('play-circle-outline'));
  grid.addAction('/api/maps',          'MapView',          'Cartes interactives avec marqueurs',                                ICON('map-outline'));
  grid.addAction('/api/notifications', 'Notification',     'Signature et envoi de notifications push (Ed25519)',                ICON('notifications-outline'));
  grid.addAction('/api/secure',        'Secure',           'Ed25519 — signature, vérification, gestion de clés',                ICON('lock-outline'));
  res.json(homeApp.serve(grid));
});

// API index — same convention: relative paths only.
demo.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'Yeria SDK Demo API',
    version: '1.0.0',
    description: 'Comprehensive demo exercising every Yeria SDK view',
    basePath: BASE_PATH || '/',
    endpoints: {
      forms:         '/api/forms',
      readers:       '/api/readers',
      actions:       '/api/actions',
      'action-grid': '/api/action-grid',
      cards:         '/api/cards',
      carousels:     '/api/carousels',
      timelines:     '/api/timelines',
      messages:      '/api/messages',
      qr:            '/api/qr',
      media:         '/api/media',
      maps:          '/api/maps',
      notifications: '/api/notifications',
      secure:        '/api/secure'
    }
  });
});

demo.use('/api/forms',         formsRouter);
demo.use('/api/readers',       readersRouter);
demo.use('/api/actions',       actionsRouter);
demo.use('/api/action-grid',   actionGridRouter);
demo.use('/api/qr',            qrRouter);
demo.use('/api/messages',      messagesRouter);
demo.use('/api/secure',        secureRouter);
demo.use('/api/cards',         cardsRouter);
demo.use('/api/carousels',     carouselsRouter);
demo.use('/api/timelines',     timelinesRouter);
demo.use('/api/media',         mediaRouter);
demo.use('/api/maps',          mapsRouter);
demo.use('/api/notifications', notificationsRouter);

// Health — always at /health (not behind the prefix), useful for container probes.
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Mount the demo under the configured prefix.
app.use(BASE_PATH || '/', demo);

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.url}` });
});

app.listen(PORT, '0.0.0.0', () => {
  const mount = BASE_PATH || '/';
  console.log(`[yeria-demo] listening on :${PORT}, mounted at ${mount}`);
});

export default app;
