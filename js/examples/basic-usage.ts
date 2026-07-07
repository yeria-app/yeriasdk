#!/usr/bin/env ts-node

/**
 * Basic usage walkthrough for the YeriaApp SDK.
 * Run with: npm run example
 */

import { BaseView, YeriaApp, Logger } from '../src/index';

Logger.getInstance().setLogLevel('info');

function header(title: string): void {
    console.log(`\n${title}`);
    console.log('='.repeat(title.length));
}

header('YeriaApp SDK – basic usage example');

// 1. Initialise YeriaApp (auto-generates Ed25519 keys if not provided)
const yeriaApp = new YeriaApp({
    appId: 'example-app',
    viewExpirationMinutes: 30
});

console.log('✅ YeriaApp ready; public key length:', yeriaApp.getPublicKey().length);

// 2. Create views using the factory helpers
header('Creating views');

const views: BaseView[] = [];

const registrationForm = yeriaApp
    .createFormView('user-registration', 'User Registration')
    .setNote('Please fill in all required fields')
    .addTextField('firstName', 'First Name', true, 50)
    .addTextField('lastName', 'Last Name', true, 50)
    .addEmailField('email', 'Email Address', true)
    .addPhoneField('phone', 'Phone Number', false)
    .addSelectField('country', 'Country', true, [
        { label: 'France', value: 'FR' },
        { label: 'Canada', value: 'CA' },
        { label: 'Belgium', value: 'BE' }
    ])
    .submitButton('Create Account', 'POST');
views.push(registrationForm);

const welcomeReader = yeriaApp
    .createReaderView('welcome', 'Bienvenue dans notre application')
    .setIntro('Découvrez nos fonctionnalités principales')
    .addParagraph('YeriaApp vous permet de générer des écrans dynamiques depuis le backend.')
    .addSubTitle('Fonctionnalités clés')
    .addListField([
        'Formulaires dynamiques avec validation',
        'Vues de lecture riches',
        'Signatures Ed25519 pour l’intégrité'
    ]);
views.push(welcomeReader);

const actionList = yeriaApp
    .createActionListView('main-menu', 'Menu Principal')
    .addAction('profile', 'Mon Profil', 'Consultez vos infos personnelles', 'profile-icon.png')
    .addAction('settings', 'Paramètres', 'Configurez l’application', 'settings-icon.png')
    .addAction('support', 'Support', 'Contactez-nous', 'support-icon.png');
views.push(actionList);

const actionGrid = yeriaApp
    .createActionGridView('dashboard', 'Tableau de bord')
    .setColumns(2)
    .addAction('analytics', 'Analyses', 'Consultez vos statistiques', 'analytics.png')
    .addAction('reports', 'Rapports', 'Générez des rapports PDF', 'reports.png')
    .addAction('users', 'Utilisateurs', 'Gérez les accès', 'users.png')
    .addAction('payments', 'Paiements', 'Suivez vos paiements', 'payments.png');
views.push(actionGrid);

const iconGrid = yeriaApp
    .createIconGridView('home-launcher', 'Accueil')
    .setIntro('Choisissez un service')
    .setShape('circle')
    .setColumns(4)
    .addIcon('map', 'Carte', 'map.png')
    .addIcon('wallet', 'Portefeuille', 'wallet.png', '3')
    .addIcon('docs', 'Documents', 'docs.png')
    .addIcon('support', 'Support', 'support.png');
views.push(iconGrid);

const qrScan = yeriaApp
    .createQRScanView('scan', 'Scanner un QR Code')
    .setIntro('Scannez un QR code pour continuer')
    .addQRCodeScan(
        'invite',
        'Scannez une invitation',
        'Scanner',
        { size: 220, errorCorrection: 'M' }
    )
    .submitButton('Envoyer les données', 'POST');
views.push(qrScan);

const qrDisplay = yeriaApp
    .createQRDisplayView('qrcode', 'Votre QR Code')
    .setIntro('Ce code vous donne accès aux services premium')
    .setQRCode(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'Code abonnement',
        'Scannez ce code pour activer votre abonnement',
        { size: 200, errorCorrection: 'Q' }
    )
    .submitButton('Partager le QR', 'POST');
views.push(qrDisplay);

const message = yeriaApp
    .createMessageView('news', 'Bienvenue !')
    .setIntro('Voici les annonces importantes pour cette semaine')
    .setBody('Découvrez les principales nouveautés de la version 2.0 et mettez à jour votre profil pour profiter des nouvelles fonctionnalités.')
    .setSeverity('info')
    .setPrimaryAction('J’ai compris', 'POST')
    .setSecondaryAction('Plus tard', 'POST')
    .setDismissible(true);
views.push(message);

const productCard = yeriaApp
    .createCardView('product-card', 'Super Gadget')
    .setSubtitle('Boostez votre journée')
    .setDescription('Un compagnon compact pour organiser vos tâches et automatiser vos routines quotidiennes.')
    .setImage('https://cdn.example.com/gadget.jpg', 'Super Gadget')
    .addStat('Prix', '49 €')
    .addSection('Points clés', 'Assistant vocal, autonomie 48h, synchronisation multi-appareils.')
    .addAction('Acheter maintenant', 'POST', { confirmMessage: 'Confirmez-vous votre achat ?' })
    .addAction('Voir les détails', 'GET', { href: '/produits/super-gadget', variant: 'link' });
views.push(productCard);
const carousel = yeriaApp.createCarouselView('home-carousel', 'Mises en avant');
carousel
    .addSlide(
        carousel.createSlide('release-2-0', 'Version 2.0', 'Découvrez les nouveautés', {
            imageUrl: 'https://cdn.example.com/banners/release.jpg',
            badge: 'Nouveau'
        })
    )
    .addSlide(
        carousel.createSlide('case-study', 'Étude client', 'Comment ACME a doublé sa productivité', {
            imageUrl: 'https://cdn.example.com/banners/case-study.jpg'
        })
    )
    .addSlideAction('release-2-0', 'Lire', 'GET', { href: '/blog/version-2-0', variant: 'link' })
    .setSettings({ autoplay: true, intervalMs: 5000, loop: true });
views.push(carousel);

const timeline = yeriaApp
    .createTimelineView('onboarding', 'Votre progression')
    .setIntro('Suivez les étapes de validation')
    .addEvent('step-1', 'Compte créé', new Date().toISOString(), { status: 'completed' })
    .addEvent('step-2', 'Documents envoyés', '2025-01-15T12:00:00Z', { status: 'active' })
    .addEvent('step-3', 'Validation finale', '2025-01-20T09:00:00Z', { status: 'pending' });
views.push(timeline);

const mediaLibrary = yeriaApp.createMediaView('media-library', 'Tutoriels express');
mediaLibrary
    .setIntro('Apprenez en quelques minutes')
    .addMediaItem(
        mediaLibrary.createMedia('video-intro', 'video', 'https://cdn.example.com/videos/intro.mp4', {
            type: 'video/mp4',
            poster: 'https://cdn.example.com/posters/intro.jpg'
        })
    )
    .addMediaItem({
        id: 'audio-guide',
        kind: 'audio',
        title: 'Guide audio',
        sources: [{ src: 'https://cdn.example.com/audio/guide.mp3', type: 'audio/mpeg' }]
    });
views.push(mediaLibrary);

const storeMap = yeriaApp
    .createMapView('stores-map', 'Boutiques partenaires')
    .setViewport({ lat: 48.8566, lon: 2.3522 }, { zoom: 12 })
    .addMarker({
        id: 'store-paris',
        title: 'Paris Centre',
        description: 'Ouvert de 9h à 19h',
        location: { lat: 48.8566, lon: 2.3522 }
    })
    .addMarker({
        id: 'store-lyon',
        title: 'Lyon République',
        location: { lat: 45.7640, lon: 4.8357 }
    })
    .setControls({ zoom: true, userLocation: true });
views.push(storeMap);

console.log('✅ Views created:', views.length);

// 3. Serve every view and verify integrity
header('Serving secure responses');

const responses = views.map(view => yeriaApp.serve(view));
responses.forEach(response => {
    const view = response.view as Record<string, unknown>;
    const viewId = typeof view['id'] === 'string' ? (view['id'] as string) : 'unknown-view';
    const viewType = typeof view['type'] === 'string' ? (view['type'] as string) : 'unknown-type';
    const isValid = yeriaApp.verifyIntegrity(response);
    console.log(`- ${viewId} (${viewType}): signature valid = ${isValid}`);
});

console.log('\n✅ Example completed successfully\n');
