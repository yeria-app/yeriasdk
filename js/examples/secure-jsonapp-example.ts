#!/usr/bin/env ts-node

import { YeriaApp } from '../src/index';

console.log('🔒 Exemple d\'utilisation sécurisée de YeriaApp\n');

try {
    // 1. Initialisation de YeriaApp avec configuration sécurisée
    console.log('🚀 1. Initialisation de YeriaApp sécurisé');
    console.log('─'.repeat(60));

    const yeriaApp = new YeriaApp({
        appId: 'my-secure-app-123',
        viewExpirationMinutes: 30
    });

    console.log('✅ YeriaApp initialisé avec succès');

    // 2. Création de vues via la factory sécurisée
    console.log('\n📋 2. Création de vues via la factory sécurisée');
    console.log('─'.repeat(60));

    // Formulaire sécurisé
    const secureForm = yeriaApp
        .createFormView('user-registration', 'User Registration')
        .addTextField('username', 'Username', true)
        .addEmailField('email', 'Email Address', true)
        .addPasswordField('password', 'Password', 8)
        .submitButton('Create Profile', 'POST');

    console.log('✅ Formulaire sécurisé créé');

    // 3. Génération de réponses sécurisées
    console.log('\n🔐 3. Génération de réponses sécurisées');
    console.log('─'.repeat(60));

    const secureFormResponse = yeriaApp.serve(secureForm);
    console.log('✅ Formulaire servi avec sécurité');
    console.log('🔏 Signature:', secureFormResponse.signature.substring(0, 32) + '...');
    console.log('⏰ Timestamp:', new Date(secureFormResponse.timestamp).toISOString());
    console.log('🆔 AppId:', secureFormResponse.appId);

    // 4. Vérification d'intégrité
    console.log('\n🔍 4. Test de vérification d\'intégrité');
    console.log('─'.repeat(60));

    const isValid = yeriaApp.verifyIntegrity(secureFormResponse);
    console.log('✅ Vérification d\'intégrité:', isValid ? 'PASS' : 'FAIL');

    console.log('\n🎉 Exemple YeriaApp sécurisé terminé avec succès !');

} catch (error) {
    console.error('❌ Erreur lors de l\'exécution :', error);
} 
