import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
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
  const actionGrid = yeriaApp
    .createActionGridView('comprehensive-grid', 'ActionGridView - Démo Complète')
    .setColumns(3)
    .setSpacing(16)

    // Actions AVEC images
    .addAction('analytics', 'Analytiques', 'Voir les rapports détaillés et statistiques', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200', false)
    .addAction('users', 'Utilisateurs', 'Gérer les comptes utilisateurs et permissions', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200', false)
    .addAction('products', 'Produits', 'Gérer votre catalogue de produits', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', false)

    // Actions SANS image (chaînes vides)
    .addAction('orders', 'Commandes', 'Traiter et suivre les commandes clients', '', false)
    .addAction('payments', 'Paiements', 'Voir l\'historique des paiements et transactions', '', false)

    // Actions AVEC images
    .addAction('reports', 'Rapports', 'Générer et exporter des rapports', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200', false)
    .addAction('calendar', 'Calendrier', 'Voir les événements et l\'agenda', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=200', false)

    // Actions SANS image
    .addAction('tasks', 'Tâches', 'Gérer votre liste de choses à faire', '', false)
    .addAction('files', 'Fichiers', 'Parcourir et gérer les fichiers', '', false)

    // Actions désactivées AVEC images
    .addAction('ai-assistant', 'Assistant IA', 'Fonctionnalité premium - Assistant intelligent', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200', true)
    .addAction('advanced-stats', 'Statistiques Avancées', 'Fonctionnalité premium - Analyses avancées', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200', true)

    // Actions SANS image
    .addAction('settings', 'Paramètres', 'Configurer les préférences de l\'application', '', false)
    .addAction('help', 'Aide', 'Obtenir de l\'aide et contacter le support', '', false)
    .addAction('notifications', 'Notifications', 'Gérer vos notifications', '', false)
    .addAction('profile', 'Profil', 'Voir et modifier votre profil', '', false);

  res.json(yeriaApp.serve(actionGrid));
});

export default router;
