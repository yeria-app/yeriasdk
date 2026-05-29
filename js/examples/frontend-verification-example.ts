#!/usr/bin/env ts-node

import { YeriaApp, SecureViewResponse } from '../src/index';

console.log('📱 Exemple de vérification côté Frontend Mobile\n');

// ===== SIMULATION D'UNE API BACKEND =====
console.log('🌐 SIMULATION API BACKEND');
console.log('─'.repeat(60));

// Simuler une API qui expose la clé publique
function getPublicKeyFromAPI(): string {
    // En réalité, cette clé viendrait d'une API sécurisée
    const yeriaApp = new YeriaApp({
        appId: 'mobile-app-456',
        viewExpirationMinutes: 60
    });
    return yeriaApp.getPublicKey();
}

// Simuler une API qui génère une vue signée
function getSignedViewFromAPI(): SecureViewResponse {
    const yeriaApp = new YeriaApp({
        appId: 'mobile-app-456',
        viewExpirationMinutes: 60
    });

    const form = yeriaApp.createFormView('mobile-form', 'Mobile Form')
        .addTextField('name', 'Full Name', true)
        .addEmailField('email', 'Email', true)
        .addPhoneField('phone', 'Phone Number', false)
        .addGPSField('location', 'Current Location', false, true)
        .submitButton('Submit', 'POST');

    return yeriaApp.serve(form);
}

// ===== CÔTÉ FRONTEND MOBILE =====
console.log('📱 CÔTÉ FRONTEND MOBILE');
console.log('─'.repeat(60));

try {
    // 1. Récupération de la clé publique depuis l'API
    console.log('🔑 1. Récupération de la clé publique...');
    const publicKey = getPublicKeyFromAPI();
    console.log('✅ Clé publique récupérée');
    console.log('📏 Taille de la clé:', publicKey.length, 'caractères');

    // 2. Récupération de la vue signée depuis l'API
    console.log('\n📥 2. Récupération de la vue signée...');
    const signedResponse = getSignedViewFromAPI();
    console.log('✅ Vue signée récupérée');
    console.log('🔒 Signature reçue:', signedResponse.signature.substring(0, 32) + '...');
    console.log('⏰ Timestamp:', new Date(signedResponse.timestamp).toISOString());
    console.log('🆔 AppId:', signedResponse.appId);

    // 3. Vérification de la signature côté frontend
    console.log('\n🔍 3. Vérification de la signature...');
    const startTime = Date.now();
    const isValid = YeriaApp.verifySignature(publicKey, signedResponse);
    const verificationTime = Date.now() - startTime;

    console.log('✅ Vérification terminée en', verificationTime, 'ms');
    console.log('🔐 Résultat:', isValid ? 'SIGNATURE VALIDE' : 'SIGNATURE INVALIDE');

    if (isValid) {
        console.log('🎉 La vue peut être affichée en toute sécurité !');

        // 4. Affichage des informations de la vue
        console.log('\n📋 4. Informations de la vue:');
        const view = signedResponse.view as any;
        console.log('   - ID:', view.id);
        console.log('   - Type:', view.type);
        console.log('   - Titre:', view.content?.title);
        console.log('   - Nombre de champs:', view.content?.fields?.length || 0);

        // 5. Vérification de l'expiration
        const now = Date.now();
        const age = now - signedResponse.timestamp;
        const maxAge = 60 * 60 * 1000; // 1 heure

        if (age > maxAge) {
            console.log('⚠️ ATTENTION: La vue a expiré !');
        } else {
            console.log('✅ La vue est encore valide');
        }
    } else {
        console.log('❌ ERREUR: La signature est invalide, ne pas afficher la vue !');
    }

    // 6. Test de performance
    console.log('\n⚡ 6. Test de performance (1000 vérifications)...');
    const performanceStart = Date.now();

    for (let i = 0; i < 1000; i++) {
        YeriaApp.verifySignature(publicKey, signedResponse);
    }

    const performanceTime = Date.now() - performanceStart;
    const avgTime = performanceTime / 1000;

    console.log('📊 Performance:');
    console.log(`   - 1000 vérifications en ${performanceTime}ms`);
    console.log(`   - Moyenne: ${avgTime.toFixed(2)}ms par vérification`);
    console.log(`   - Débit: ${(1000 / (performanceTime / 1000)).toFixed(0)} vérifications/seconde`);

    // 7. Exemple d'utilisation dans une app mobile
    console.log('\n📱 7. Exemple d\'intégration mobile:');
    console.log(`
// Dans votre app React Native / Flutter / Native

// 1. Récupérer la clé publique au démarrage
const publicKey = await fetch('/api/public-key').then(r => r.text());

// 2. Récupérer une vue signée
const signedView = await fetch('/api/views/form-123').then(r => r.json());

// 3. Vérifier la signature avant affichage
if (YeriaApp.verifySignature(publicKey, signedView)) {
    // Afficher la vue en toute sécurité
    displayView(signedView.view);
} else {
    // Afficher une erreur de sécurité
    showSecurityError();
}
    `);

    console.log('\n🎉 Exemple frontend mobile terminé avec succès !');
    console.log('💡 Ed25519 offre d\'excellentes performances pour les apps mobiles');

} catch (error) {
    console.error('❌ Erreur lors de l\'exécution :', error);
} 
