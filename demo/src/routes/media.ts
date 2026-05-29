import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-media',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// Comprehensive MediaView demonstration with all features
router.get('/', (req: Request, res: Response) => {
  const media = yeriaApp.createMediaView('comprehensive-media', 'MediaView - Démo Complète');

  media
    .setIntro('Cette vue démontre toutes les fonctionnalités du lecteur multimédia avec différents types de contenu : vidéos et audios, avec diverses configurations')

    // Vidéo 1 - Avec toutes les options : poster, title, description
    .addMediaItem({
      id: 'video-tutorial-intro',
      kind: 'video',
      title: 'Introduction à Yeria SDK (5 min)',
      description: 'Découvrez les bases du Yeria SDK et comment créer votre première application dynamique. Ce tutoriel couvre l\'installation, la configuration initiale et les concepts fondamentaux.',
      poster: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800',
      sources: [
        { src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'video/mp4' }
      ],
      controls: true,
      autoplay: false,
      loop: false
    })

    // Vidéo 2 - Avec méthode createMedia et options
    .addMediaItem(
      media.createMedia(
        'video-tutorial-forms',
        'video',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        {
          title: 'Créer des Formulaires Dynamiques (8 min)',
          type: 'video/mp4',
          poster: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
          description: 'Guide complet sur la création de FormView avec validation, tous les types de champs et gestion des soumissions.',
          autoplay: false,
          loop: false,
          controls: true
        }
      )
    )

    // Vidéo 3 - Format court avec poster
    .addMediaItem({
      id: 'video-demo-product',
      kind: 'video',
      title: 'Démonstration Produit (3 min)',
      description: 'Présentation rapide des fonctionnalités principales de Yeria SDK en action.',
      poster: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      sources: [
        { src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', type: 'video/mp4' }
      ],
      controls: true
    })

    // Vidéo 4 - Sans poster pour tester l'affichage sans image
    .addMediaItem(
      media.createMedia(
        'video-advanced-features',
        'video',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        {
          title: 'Fonctionnalités Avancées (12 min)',
          type: 'video/mp4',
          description: 'Explorez les fonctionnalités avancées : signatures Ed25519, sécurité, optimisation des performances et architecture scalable.',
          controls: true
        }
      )
    )

    // Vidéo 5 - Webinaire avec poster
    .addMediaItem({
      id: 'video-webinar',
      kind: 'video',
      title: 'Webinaire : Migration vers Yeria (45 min)',
      description: 'Stratégies complètes pour migrer vos applications existantes vers Yeria SDK. Inclut des études de cas réelles et des recommandations d\'experts.',
      poster: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      sources: [
        { src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', type: 'video/mp4' }
      ],
      controls: true,
      autoplay: false
    })

    // Audio 1 - Podcast avec description complète
    .addMediaItem({
      id: 'podcast-episode-1',
      kind: 'audio',
      title: 'Podcast Tech - Épisode 1 : Les Fondamentaux',
      description: 'Discussion approfondie avec l\'équipe de développement sur l\'architecture de Yeria, les principes de design et la philosophie du projet. Durée : 32 minutes.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    // Audio 2 - Podcast court
    .addMediaItem({
      id: 'podcast-episode-2',
      kind: 'audio',
      title: 'Podcast Tech - Épisode 2 : Architecture Moderne',
      description: 'Best practices pour structurer vos projets Yeria. Découvrez les patterns recommandés et les pièges à éviter. Durée : 28 minutes.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    // Audio 3 - Épisode sur la sécurité
    .addMediaItem({
      id: 'podcast-episode-3',
      kind: 'audio',
      title: 'Podcast Tech - Épisode 3 : Sécurité et Cryptographie',
      description: 'Comprendre les signatures Ed25519, la validation des données et les bonnes pratiques de sécurité pour vos applications. Durée : 35 minutes.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    // Audio 4 - Musique de concentration
    .addMediaItem({
      id: 'music-focus-flow',
      kind: 'audio',
      title: 'Musique - Focus Flow (Ambient Mix)',
      description: 'Musique d\'ambiance relaxante pour coder en concentration. Parfait pour les sessions de développement intensives. Durée : 42 minutes.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', type: 'audio/mpeg' }
      ],
      controls: true,
      loop: true
    })

    // Audio 5 - Musique électronique
    .addMediaItem({
      id: 'music-deep-work',
      kind: 'audio',
      title: 'Musique - Deep Work (Electronic)',
      description: 'Électronique douce pour maintenir la concentration et la productivité. Idéal pour le travail profond et la résolution de problèmes complexes.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', type: 'audio/mpeg' }
      ],
      controls: true,
      loop: true
    })

    // Audio 6 - Lo-fi beats
    .addMediaItem({
      id: 'music-lofi-beats',
      kind: 'audio',
      title: 'Musique - Code Mode (Lo-fi Beats)',
      description: 'Beats lo-fi pour rester productif et créatif pendant vos sessions de code. Ambiance détendue et inspirante.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', type: 'audio/mpeg' }
      ],
      controls: true,
      loop: true
    })

    // Audio 7 - Guide audio
    .addMediaItem({
      id: 'audio-guide-quickstart',
      kind: 'audio',
      title: 'Guide Audio - Démarrage Rapide',
      description: 'Commencez avec Yeria SDK en seulement 10 minutes. Guide pas à pas pour votre premier projet, narré et facile à suivre.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    // Audio 8 - Interview
    .addMediaItem({
      id: 'interview-future-mobile',
      kind: 'audio',
      title: 'Interview : L\'Avenir du Développement Mobile',
      description: 'Discussion exclusive avec les créateurs de Yeria sur l\'avenir du développement mobile, les tendances émergentes et la vision à long terme du projet. Durée : 48 minutes.',
      sources: [
        { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    });

  res.json(yeriaApp.serve(media));
});

export default router;
