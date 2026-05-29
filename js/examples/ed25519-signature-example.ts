#!/usr/bin/env ts-node

import { YeriaApp, SecureViewResponse } from '../src/index';

console.log('🔐 Exemple de signature Ed25519 - Backend et Frontend\n');

// ===== CÔTÉ BACKEND =====
console.log('🚀 CÔTÉ BACKEND - Génération de vues signées');
console.log('─'.repeat(60));

try {
    // 1. Initialisation de YeriaApp avec génération automatique des clés Ed25519
    const yeriaApp = new YeriaApp({
        appId: 'my-secure-app-123',
        viewExpirationMinutes: 30
    });

    console.log('✅ YeriaApp initialisé avec clés Ed25519 auto-générées');

    // 2. Récupération de la clé publique pour l'exposer au frontend
    const publicKey = yeriaApp.getPublicKey();
    console.log('🔑 Clé publique (à exposer au frontend):');
    console.log(publicKey.substring(0, 50) + '...');

    // 3. Création d'une vue sécurisée
    const secureForm = yeriaApp.createFormView('user-registration', 'User Registration')
        .addTextField('username', 'Username', true)
        .addEmailField('email', 'Email Address', true)
        .addPasswordField('password', 'Password', 8)
        .addNumberField('age', 'Age', false, 13, 120)
        .addDateField('birthdate', 'Birth Date', false)
        .addSelectField('country', 'Country', true, [
            { label: 'France', value: 'FR' },
            { label: 'Canada', value: 'CA' },
            { label: 'Belgique', value: 'BE' }
        ])
        .submitButton('Create Profile', 'POST');

    console.log('✅ Formulaire sécurisé créé');

    // 4. Génération de la réponse signée
    const secureResponse = yeriaApp.serve(secureForm);
    console.log('✅ Réponse signée générée');
    console.log('🔒 Signature:', secureResponse.signature.substring(0, 32) + '...');
    console.log('⏰ Timestamp:', new Date(secureResponse.timestamp).toISOString());
    console.log('🆔 AppId:', secureResponse.appId);

    // 5. Vérification côté backend
    const backendVerification = yeriaApp.verifyIntegrity(secureResponse);
    console.log('✅ Vérification côté backend:', backendVerification ? 'PASS' : 'FAIL');

    // ===== SIMULATION CÔTÉ FRONTEND =====
    console.log('\n📱 CÔTÉ FRONTEND - Vérification de la signature');
    console.log('─'.repeat(60));

    // Simulation de réception côté frontend
    console.log('📥 Frontend reçoit la réponse signée et la clé publique');

    // 6. Vérification côté frontend avec la clé publique
    const frontendVerification = YeriaApp.verifySignature(publicKey, secureResponse);
    console.log('✅ Vérification côté frontend:', frontendVerification ? 'PASS' : 'FAIL');

    // 7. Test de manipulation (doit échouer)
    console.log('\n🧪 Test de sécurité - Manipulation détectée');
    console.log('─'.repeat(60));

    const tamperedResponse: SecureViewResponse = {
        ...secureResponse,
        view: { ...secureResponse.view, tampered: true }
    };

    const tamperedVerification = YeriaApp.verifySignature(publicKey, tamperedResponse);
    console.log('❌ Vérification réponse modifiée:', tamperedVerification ? 'PASS' : 'FAIL');

    // 8. Test de mauvais AppId (doit échouer)
    const wrongAppResponse: SecureViewResponse = {
        ...secureResponse,
        appId: 'wrong-app-id'
    };

    const wrongAppVerification = YeriaApp.verifySignature(publicKey, wrongAppResponse);
    console.log('❌ Vérification mauvais AppId:', wrongAppVerification ? 'PASS' : 'FAIL');

    // 9. Exemple de structure JSON sécurisée
    console.log('\n📄 Structure JSON sécurisée (exemple)');
    console.log('─'.repeat(60));

    console.log(JSON.stringify(secureResponse, null, 2));

    console.log('\n🎉 Exemple Ed25519 terminé avec succès !');
    console.log('💡 La signature Ed25519 garantit l\'intégrité et l\'authenticité des vues');
    console.log('📱 Le frontend peut vérifier la signature sans avoir accès à la clé privée');

} catch (error) {
    console.error('❌ Erreur lors de l\'exécution :', error);
} 
