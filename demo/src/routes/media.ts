import { Router, Request, Response } from 'express';
import { YeriaApp, YeriaUI } from '@numerum-tech/yeriasdk';
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
  const media = YeriaUI.createMediaView('comprehensive-media', 'MediaView');

  // NOTE: titles/descriptions match the ACTUAL sample clips behind each
  // `api/media/:name` redirect (public Blender / W3C / Flutter sample videos
  // and SoundHelix instrumental tracks) — not fictional product content.
  media
    .setIntro('Démonstration du lecteur multimédia : vidéos et pistes audio d\'exemple, avec lecture en ligne et liste de lecture.')

    // ── Videos ───────────────────────────────────────────────────────────
    .addMediaItem({
      id: 'video-big-buck-bunny',
      kind: 'video',
      title: 'Big Buck Bunny',
      description: 'Court‑métrage d\'animation libre de la Blender Foundation.',
      poster: 'img/media-intro.png',
      sources: [
        { src: 'api/media/BigBuckBunny.mp4', type: 'video/mp4' }
      ],
      controls: true,
      autoplay: false,
      loop: false
    })

    .addMediaItem(
      media.createMedia('video-sintel', 'video', 'api/media/Sintel.mp4', {
        title: 'Sintel — bande‑annonce',
        type: 'video/mp4',
        poster: 'img/media-webinar.png',
        description:
          'Bande‑annonce du court‑métrage Sintel, produit par la Blender Foundation '
          + 'dans le cadre du projet open movie Durian. Réalisé entièrement avec des '
          + 'logiciels libres, Sintel raconte l\'histoire d\'une jeune femme, Sintel, '
          + 'partie à la recherche d\'un jeune dragon qu\'elle a recueilli. Cette '
          + 'description volontairement longue sert à démontrer le repliement du texte '
          + 'avec le bouton « Voir plus / Voir moins ».',
        autoplay: true, // demonstrates autoplay on the selected entry
        controls: true
      })
    )

    .addMediaItem({
      id: 'video-bee',
      kind: 'video',
      title: 'Abeille (clip d\'exemple)',
      description: 'Clip vidéo d\'exemple — gros plan sur une abeille (Flutter).',
      poster: 'img/media-product-demo.png',
      sources: [
        { src: 'api/media/Bee.mp4', type: 'video/mp4' }
      ],
      controls: true
    })

    .addMediaItem(
      media.createMedia('video-butterfly', 'video', 'api/media/Butterfly.mp4', {
        title: 'Papillon (clip d\'exemple)',
        type: 'video/mp4',
        description: 'Clip vidéo d\'exemple — un papillon (Flutter). Sans poster.',
        controls: true
      })
    )

    .addMediaItem({
      id: 'video-w3c-sample',
      kind: 'video',
      title: 'Vidéo de démonstration (W3C)',
      description: 'Petit clip de test vidéo hébergé par le W3C.',
      poster: 'img/media-forms.png',
      sources: [
        { src: 'api/media/W3CSample.mp4', type: 'video/mp4' }
      ],
      controls: true
    })

    // ── Audio (SoundHelix — pistes instrumentales de démonstration) ───────
    .addMediaItem({
      id: 'audio-soundhelix-1',
      kind: 'audio',
      title: 'SoundHelix — Morceau 1',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix).',
      sources: [
        { src: 'api/media/SoundHelix-Song-1.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    .addMediaItem({
      id: 'audio-soundhelix-2',
      kind: 'audio',
      title: 'SoundHelix — Morceau 2',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix).',
      sources: [
        { src: 'api/media/SoundHelix-Song-2.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    .addMediaItem({
      id: 'audio-soundhelix-3',
      kind: 'audio',
      title: 'SoundHelix — Morceau 3',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix).',
      sources: [
        { src: 'api/media/SoundHelix-Song-3.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    .addMediaItem({
      id: 'audio-soundhelix-4',
      kind: 'audio',
      title: 'SoundHelix — Morceau 4 (en boucle)',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix). Lecture en boucle.',
      sources: [
        { src: 'api/media/SoundHelix-Song-4.mp3', type: 'audio/mpeg' }
      ],
      controls: true,
      loop: true
    })

    .addMediaItem({
      id: 'audio-soundhelix-5',
      kind: 'audio',
      title: 'SoundHelix — Morceau 5 (en boucle)',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix). Lecture en boucle.',
      sources: [
        { src: 'api/media/SoundHelix-Song-5.mp3', type: 'audio/mpeg' }
      ],
      controls: true,
      loop: true
    })

    .addMediaItem({
      id: 'audio-soundhelix-6',
      kind: 'audio',
      title: 'SoundHelix — Morceau 6',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix).',
      sources: [
        { src: 'api/media/SoundHelix-Song-6.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    .addMediaItem({
      id: 'audio-soundhelix-7',
      kind: 'audio',
      title: 'SoundHelix — Morceau 7',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix).',
      sources: [
        { src: 'api/media/SoundHelix-Song-7.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    })

    .addMediaItem({
      id: 'audio-soundhelix-8',
      kind: 'audio',
      title: 'SoundHelix — Morceau 8',
      description: 'Piste musicale instrumentale de démonstration (SoundHelix).',
      sources: [
        { src: 'api/media/SoundHelix-Song-8.mp3', type: 'audio/mpeg' }
      ],
      controls: true
    });

  // Open the player on Sintel (which has autoplay) to exercise selected + autoplay.
  media.setSelectedItem('video-sintel');

  res.json(yeriaApp.serve(media));
});

export default router;
