import { CardView, YeriaLink } from '../src';
import { InvalidParameterError } from '../src/errors';

describe('YeriaLink', () => {
    test('generates HTTPS links by default', () => {
        expect(YeriaLink.service('catalog.v2')).toBe(
            'https://yeria.app/dl/s/catalog.v2'
        );
        expect(YeriaLink.chat('catalog.v2')).toBe(
            'https://yeria.app/dl/c/catalog.v2'
        );
        expect(YeriaLink.pin('catalog.v2')).toBe(
            'https://yeria.app/dl/p/catalog.v2'
        );
        expect(YeriaLink.subscribe('catalog.v2')).toBe(
            'https://yeria.app/dl/n/catalog.v2'
        );
        expect(YeriaLink.component('catalog.v2', '/orders?mode=edit')).toBe(
            'https://yeria.app/dl/v/catalog.v2?p=%2Forders%3Fmode%3Dedit'
        );
    });

    test('generates compact custom-scheme links', () => {
        expect(YeriaLink.chat('service_42', { format: 'yeria' })).toBe(
            'yeria://dl/c/service_42'
        );
    });

    test('validates only canonical supported links', () => {
        expect(YeriaLink.isValid(YeriaLink.service('catalog'))).toBe(true);
        expect(YeriaLink.isValid(YeriaLink.component('catalog', '/orders'))).toBe(true);
        expect(YeriaLink.isValid('https://outside.example/dl/s/catalog')).toBe(false);
        expect(YeriaLink.isValid('yeria://dl/x/catalog')).toBe(false);
        expect(YeriaLink.isValid('yeria://dl/s/catalog?redirect=outside')).toBe(false);
        expect(YeriaLink.isValid('https://yeria.app/service/catalog')).toBe(false);
    });

    test('rejects unsafe identifiers and provider paths', () => {
        expect(() => YeriaLink.service('hello world')).toThrow(InvalidParameterError);
        expect(() => YeriaLink.component('catalog', 'https://outside.example')).toThrow(
            InvalidParameterError
        );
        expect(() => YeriaLink.component('catalog', '/../admin')).toThrow(
            InvalidParameterError
        );
        expect(() => YeriaLink.component('catalog', '?mode=edit')).toThrow(
            InvalidParameterError
        );
    });

    test('allows canonical custom links in card actions', () => {
        const view = new CardView('card', 'Card')
            .setDescription('Description')
            .addAction('Chat', 'GET', {
                href: YeriaLink.chat('catalog', { format: 'yeria' })
            });

        expect(view.getContent().actions[0]!.href).toBe('yeria://dl/c/catalog');
    });
});
