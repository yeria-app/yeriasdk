import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-timelines',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// Comprehensive TimelineView demonstration with all features
router.get('/', (req: Request, res: Response) => {
  const timeline = yeriaApp
    .createTimelineView('comprehensive-timeline', 'TimelineView - Démo Complète')
    .setIntro('Cette timeline démontre toutes les fonctionnalités disponibles avec différents statuts (completed, active, pending) et types d\'événements')

    // Événements complétés (completed) - Commande passée
    .addEvent('event-01', 'Commande Passée', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Votre commande #CMD-2024-78945 a été enregistrée avec succès. Total : 1 245,99 €',
      icon: '🛒'
    })

    .addEvent('event-02', 'Paiement Confirmé', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Le paiement par carte bancaire a été traité et validé',
      icon: '💳'
    })

    .addEvent('event-03', 'Commande en Préparation', new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Vos articles sont en cours de préparation dans notre entrepôt',
      icon: '📦'
    })

    .addEvent('event-04', 'Colis Emballé', new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Votre colis a été emballé et étiqueté pour l\'expédition',
      icon: '📮'
    })

    .addEvent('event-05', 'Remis au Transporteur', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Le colis a été remis à notre partenaire de livraison',
      icon: '🚚'
    })

    // Événement actif (active) - En cours
    .addEvent('event-06', 'En Transit', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'active',
      description: 'Votre colis est actuellement en transit vers le centre de distribution régional',
      icon: '🚛'
    })

    // Événements en attente (pending) - À venir
    .addEvent('event-07', 'En Livraison', new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'pending',
      description: 'Le colis sera pris en charge par le livreur pour la livraison finale',
      icon: '🏃'
    })

    .addEvent('event-08', 'Livré', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'pending',
      description: 'Livraison prévue à votre adresse : 123 Rue de la République, 75001 Paris',
      icon: '✅'
    })

    // Événements de projet (completed) - Sans icônes
    .addEvent('event-09', 'Projet Initié', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Réunion de lancement et définition du périmètre du projet'
    })

    .addEvent('event-10', 'Phase de Conception', new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Création des wireframes, maquettes UI/UX et architecture technique'
    })

    .addEvent('event-11', 'Sprint 1 Complété', new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Développement des fonctionnalités de base : authentification et tableau de bord'
    })

    .addEvent('event-12', 'Sprint 2 Complété', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Implémentation du système de gestion des utilisateurs et des rôles'
    })

    .addEvent('event-13', 'Sprint 3 Complété', new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Intégration des paiements et système de notifications'
    })

    // Événements de projet (active)
    .addEvent('event-14', 'Sprint 4 en Cours', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'active',
      description: 'Développement des fonctionnalités avancées : rapports et analytiques'
    })

    // Événements de projet (pending)
    .addEvent('event-15', 'Tests et QA', new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'pending',
      description: 'Phase de tests fonctionnels, tests d\'intégration et correction de bugs'
    })

    .addEvent('event-16', 'Déploiement Production', new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'pending',
      description: 'Mise en production de l\'application et monitoring'
    })

    // Événements d'onboarding - Avec icônes
    .addEvent('event-17', 'Compte Créé', new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Inscription réussie ! Bienvenue dans notre plateforme',
      icon: '👤'
    })

    .addEvent('event-18', 'Email Vérifié', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Votre adresse email a été confirmée avec succès',
      icon: '✉️'
    })

    .addEvent('event-19', 'Profil Complété', new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Photo de profil et informations personnelles ajoutées',
      icon: '📝'
    })

    .addEvent('event-20', 'Premier Projet Créé', new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), {
      status: 'active',
      description: 'Vous avez créé votre premier projet : "Application Mobile"',
      icon: '🚀'
    })

    .addEvent('event-21', 'Inviter des Collaborateurs', new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), {
      status: 'pending',
      description: 'Invitez votre équipe à rejoindre votre espace de travail',
      icon: '👥'
    })

    .addEvent('event-22', 'Explorer les Fonctionnalités', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), {
      status: 'pending',
      description: 'Découvrez toutes les possibilités offertes par la plateforme',
      icon: '🎯'
    })

    // Événements d'activité récente - Mélange avec et sans icônes
    .addEvent('event-23', 'Connexion Réussie', new Date(Date.now() - 15 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Connexion depuis Paris, France • Chrome on MacOS • IP: 92.184.***.**',
      icon: '🔐'
    })

    .addEvent('event-24', 'Document Modifié', new Date(Date.now() - 45 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Fichier "Rapport_Q1_2024.pdf" mis à jour avec les dernières données',
      icon: '📄'
    })

    .addEvent('event-25', 'Fichier Partagé', new Date(Date.now() - 90 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Document "Presentation_Client.pptx" partagé avec 5 membres de l\'équipe'
    })

    .addEvent('event-26', 'Commentaire Ajouté', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Nouveau commentaire sur la tâche "Révision du design"',
      icon: '💬'
    })

    .addEvent('event-27', 'Paramètres Modifiés', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Notifications activées pour les mentions et messages directs',
      icon: '⚙️'
    })

    .addEvent('event-28', 'Nouveau Membre', new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'marie.dupont@company.com a été invitée et a rejoint le projet'
    })

    .addEvent('event-29', 'Sauvegarde Automatique', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Backup automatique effectué avec succès • 2,3 Go sauvegardés',
      icon: '💾'
    })

    .addEvent('event-30', 'Mise à Jour Disponible', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), {
      status: 'completed',
      description: 'Version 2.5.0 installée avec de nouvelles fonctionnalités',
      icon: '🔄'
    });

  res.json(yeriaApp.serve(timeline));
});

export default router;
