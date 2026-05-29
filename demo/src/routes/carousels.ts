import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-carousels',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// Comprehensive CarouselView demonstration with all features
router.get('/', (req: Request, res: Response) => {
  const carousel = yeriaApp
    .createCarouselView('comprehensive-carousel', 'CarouselView - Démo Complète')
    .setSubtitle('Démonstration de toutes les fonctionnalités du carrousel avec divers types de diapositives')
    .setSettings({
      autoplay: true,
      intervalMs: 5000,
      loop: true,
      showIndicators: true
    })

    // Diapositive 1 - Avec image, description et badge
    .addSlide({
      id: 'slide-tech',
      title: 'Innovation Technologique',
      description: 'Découvrez les dernières innovations dans le domaine de la technologie et du développement moderne',
      image: { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', alt: 'Technologie' },
      badge: 'Nouveau'
    })

    // Diapositive 2 - Avec image et description
    .addSlide({
      id: 'slide-dev',
      title: 'Développement Web',
      description: 'Construisez des applications web modernes avec les meilleurs outils et frameworks disponibles',
      image: { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800', alt: 'Développement' }
    })

    // Diapositive 3 - Avec image, description et badge
    .addSlide({
      id: 'slide-analytics',
      title: 'Analytiques Avancées',
      description: 'Suivez vos performances et analysez vos données pour prendre de meilleures décisions',
      image: { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', alt: 'Analytiques' },
      badge: 'Populaire'
    })

    // Diapositive 4 - Produit avec action
    .addSlide({
      id: 'slide-product',
      title: 'MacBook Pro 16"',
      description: 'Le MacBook le plus puissant jamais créé. Puce M3 Pro, écran Retina XDR, autonomie exceptionnelle',
      image: { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', alt: 'MacBook Pro' },
      badge: 'Bestseller'
    })

    // Diapositive 5 - Témoignage
    .addSlide({
      id: 'slide-testimonial',
      title: 'Sarah Martin',
      description: '"Yeria SDK a complètement transformé notre processus de développement mobile. Nous livrons maintenant des fonctionnalités 3 fois plus rapidement qu\'avant."',
      image: { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', alt: 'Sarah Martin' },
      badge: 'CTO, TechCorp'
    })

    // Diapositive 6 - Onboarding
    .addSlide({
      id: 'slide-onboard',
      title: 'Prêt à Commencer ?',
      description: 'Créez votre première vue dynamique et découvrez la puissance du développement backend-driven',
      image: { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', alt: 'Commencer' },
      badge: 'Guide'
    })

    // Diapositive 7 - Événement
    .addSlide({
      id: 'slide-event',
      title: 'Webinaire Gratuit',
      description: 'Rejoignez-nous le 15 décembre pour un webinaire exclusif sur les meilleures pratiques Yeria',
      image: { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', alt: 'Webinaire' },
      badge: 'Gratuit'
    })

    // Diapositive 8 - Actualité
    .addSlide({
      id: 'slide-news',
      title: 'Version 3.0 Disponible',
      description: 'La nouvelle version majeure est sortie avec de nombreuses fonctionnalités attendues et améliorations',
      image: { url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800', alt: 'Actualité' },
      badge: '🎉 Nouveau'
    });

  // Ajouter des actions à différentes diapositives
  carousel
    .addSlideAction('slide-tech', 'En Savoir Plus', 'GET', {
      href: '/tech/innovations',
      icon: '🔍'
    })
    .addSlideAction('slide-product', 'Acheter Maintenant', 'POST', {
      confirmMessage: 'Ajouter au panier ?',
      icon: '🛒'
    })
    .addSlideAction('slide-product', 'Voir les Détails', 'GET', {
      href: '/products/macbook-pro-16',
      icon: 'ℹ️'
    })
    .addSlideAction('slide-onboard', 'Commencer', 'POST', {
      href: '/dashboard',
      icon: '🚀'
    })
    .addSlideAction('slide-event', 'S\'inscrire', 'POST', {
      confirmMessage: 'Confirmer votre inscription au webinaire ?',
      icon: '📝'
    })
    .addSlideAction('slide-news', 'Découvrir v3.0', 'GET', {
      href: '/news/version-3',
      icon: '✨'
    });

  res.json(yeriaApp.serve(carousel));
});

export default router;
