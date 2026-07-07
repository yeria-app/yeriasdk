import { Router, Request, Response } from 'express';
import { YeriaApp, YeriaUI } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-action-grid',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// Comprehensive ActionGridView demonstration with all features
router.get('/', (req: Request, res: Response) => {
  const actionGrid = YeriaUI
    .createActionGridView('comprehensive-grid', 'ActionGridView')
    .setIntro('Disposition en grille d\'actions. Touchez une carte pour naviguer.')
    .setColumns(3)
    .setSpacing(16)

    // Actions AVEC images
    .addAction('analytics', 'Analytiques', 'Voir les rapports détaillés et statistiques', 'img/grid-analytics.png', false)
    .addAction('users', 'Utilisateurs', 'Gérer les comptes utilisateurs et permissions', 'img/grid-users.png', false)
    .addAction('products', 'Produits', 'Gérer votre catalogue de produits', 'img/grid-products.png', false)

    // Actions SANS image (chaînes vides)
    .addAction('orders', 'Commandes', 'Traiter et suivre les commandes clients', '', false)
    .addAction('payments', 'Paiements', 'Voir l\'historique des paiements et transactions', '', false)

    // Actions AVEC images
    .addAction('reports', 'Rapports', 'Générer et exporter des rapports', 'img/grid-reports.png', false)
    .addAction('calendar', 'Calendrier', 'Voir les événements et l\'agenda', 'img/grid-calendar.png', false)

    // Actions SANS image
    .addAction('tasks', 'Tâches', 'Gérer votre liste de choses à faire', '', false)
    .addAction('files', 'Fichiers', 'Parcourir et gérer les fichiers', '', false)

    // Actions désactivées AVEC images
    .addAction('ai-assistant', 'Assistant IA', 'Fonctionnalité premium - Assistant intelligent', 'img/grid-ai-assistant.png', true)
    .addAction('advanced-stats', 'Statistiques Avancées', 'Fonctionnalité premium - Analyses avancées', 'img/grid-advanced-stats.png', true)

    // Actions SANS image
    .addAction('settings', 'Paramètres', 'Configurer les préférences de l\'application', '', false)
    .addAction('help', 'Aide', 'Obtenir de l\'aide et contacter le support', '', false)
    .addAction('notifications', 'Notifications', 'Gérer vos notifications', '', false)
    .addAction('profile', 'Profil', 'Voir et modifier votre profil', '', false);

  res.json(yeriaApp.serve(actionGrid));
});

export default router;
