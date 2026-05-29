import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-actions',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// Comprehensive ActionListView and ActionGridView demonstration
router.get('/', (req: Request, res: Response) => {
  // Show ActionListView with comprehensive examples
  const actionList = yeriaApp
    .createActionListView('comprehensive-actions', 'Vues Actions - Démo Complète')

    // Action GET standard - AVEC IMAGE
    .addAction('view-profile', 'Voir le Profil', 'Naviguer vers la page de profil (requête GET)', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', false)

    // Action POST pour créer - SANS IMAGE (icon)
    .addAction('create-item', 'Créer un Nouvel Élément', 'Créer une nouvelle ressource (requête POST)', '', false)

    // Action PUT pour mettre à jour - AVEC IMAGE
    .addAction('update-settings', 'Mettre à Jour les Paramètres', 'Modifier les paramètres existants (requête PUT)', 'https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=200', false)

    // Action DELETE - SANS IMAGE (icon)
    .addAction('delete-account', 'Supprimer le Compte', 'Supprimer définitivement le compte (requête DELETE)', '', false)

    // Action désactivée - AVEC IMAGE
    .addAction('premium-feature', 'Fonctionnalité Premium', 'Cette fonctionnalité nécessite une mise à niveau', 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=200', true)

    // Action avec métadonnées - SANS IMAGE (icon)
    .addAction('share-content', 'Partager le Contenu', 'Partager ce contenu avec d\'autres', '', false, { category: 'social' })

    // Actions de navigation - SANS IMAGE (icons)
    .addAction('back', 'Retour', 'Retourner à l\'écran précédent', '', false)
    .addAction('home', 'Accueil', 'Retourner à l\'écran d\'accueil', '', false)
    .addAction('refresh', 'Actualiser', 'Recharger les données actuelles', '', false)

    // Démonstration des différentes méthodes HTTP
    // GET - AVEC IMAGE
    .addAction('fetch-data', 'Récupérer les Données (GET)', 'Récupérer les données du serveur', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200', false)

    // POST - SANS IMAGE (icon)
    .addAction('submit-form', 'Soumettre le Formulaire (POST)', 'Envoyer les données au serveur', '', false)

    // PUT - AVEC IMAGE
    .addAction('update-resource', 'Mettre à Jour (PUT)', 'Modifier une ressource existante', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200', false)

    // DELETE - SANS IMAGE (icon)
    .addAction('remove-item', 'Supprimer (DELETE)', 'Supprimer l\'élément sélectionné', '', false);

  res.json(yeriaApp.serve(actionList));
});

export default router;
