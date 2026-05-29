// Configuration globale pour les tests
import { Logger } from '../src/utils/logger';

// Désactiver les logs pendant les tests
Logger.getInstance().setLogLevel('error');

// Configuration globale pour Jest
beforeAll(() => {
    // Configuration avant tous les tests
    console.log('🧪 Starting YeriaApp SDK tests...');
});

afterAll(() => {
    // Nettoyage après tous les tests
    console.log('✅ YeriaApp SDK tests completed');
});

// Configuration pour chaque test
beforeEach(() => {
    // Reset des mocks et état global avant chaque test
    jest.clearAllMocks();
});

afterEach(() => {
    // Nettoyage après chaque test
    jest.restoreAllMocks();
});

// Configuration des timeouts
jest.setTimeout(10000);

// Don't mock marked - we need real markdown parsing for security tests
// jest.mock('marked', () => ({
//     marked: jest.fn((text: string) => `<p>${text}</p>`)
// }));

// Configuration des variables d'environnement pour les tests
if (typeof process !== 'undefined') {
    process.env['NODE_ENV'] = 'test';
    process.env['LOG_LEVEL'] = 'error';
} 