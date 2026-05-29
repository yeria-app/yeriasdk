import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-notifications',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
  // Note: platformUrl is intentionally unset. The demo signs notifications and
  // returns the signed payload; sendNotification() over HTTP requires the live
  // Yeria platform endpoint, which the demo does not assume.
});

const SAMPLES = [
  { id: 'welcome', title: 'Bienvenue !', body: 'Merci d\'avoir rejoint Yeria. Découvrez nos services.', link: '/home' },
  { id: 'message', title: 'Nouveau message', body: 'Vous avez reçu un nouveau message dans votre boîte de réception.', link: '/messages' },
  { id: 'reminder', title: 'Rappel rendez-vous', body: 'Votre rendez-vous est prévu demain à 14h00.', link: '/calendar' },
  { id: 'promo', title: 'Offre spéciale', body: '20% de réduction sur tous les services jusqu\'à dimanche.', link: '/offers' }
];

// Index — ActionListView with one entry per sample notification
router.get('/', (req: Request, res: Response) => {
  let list = yeriaApp.createActionListView('notifications-index', 'Notifications - Démos');
  list = list
    .setIntro('Le SDK signe une notification (Ed25519) et la POSTe à la plateforme Yeria. Ces démos signent et renvoient le payload sans appel HTTP.');
  for (const s of SAMPLES) {
    list = list.addAction(`/api/notifications/send/${s.id}`, s.title, s.body, '🔔', false, { method: 'POST' });
  }
  res.json(yeriaApp.serve(list));
});

// Returns a signed notification payload — what the SDK would POST to the platform.
router.post('/send/:id', (req: Request, res: Response) => {
  const sample = SAMPLES.find(s => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: `unknown sample: ${req.params.id}` });
    return;
  }

  const userId = (req.body && req.body.userId) || 'demo-user-42';
  const notification = yeriaApp.createNotification(userId, sample.title, sample.body, sample.link);
  const signed = yeriaApp.signNotification(notification);

  res.json({
    note: 'This is the signed payload the SDK would POST to platformUrl when configured.',
    sample: sample.id,
    signed
  });
});

// Generic ad-hoc send — accepts { userId, title, body, link }
router.post('/send', (req: Request, res: Response) => {
  const { userId, title, body, link } = req.body || {};
  if (!userId || !title || !body) {
    res.status(400).json({ error: 'userId, title, and body are required' });
    return;
  }
  const notification = yeriaApp.createNotification(userId, title, body, link);
  res.json(yeriaApp.signNotification(notification));
});

export default router;
