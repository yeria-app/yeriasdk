import { CardView } from '../src/core/card-view';
import { InvalidParameterError } from '../src/errors';

// Layout elements of the card: the form's paragraph, spacer and separator,
// living in `sections` in call order. Mirrored one-to-one by
// py/tests/test_card_view.py.
describe('CardView layout blocks', () => {
    test('paragraph, spacer and separator take their place among the sections in call order', () => {
        const card = new CardView('c', 'T')
            .addSection('H1', 'a • b')
            .addParagraph('  note ', { size: 'sm', bold: true })
            .addSpacer('lg')
            .addSeparator(' Details ')
            .addSection('H2', 'text');

        expect(JSON.stringify(card.getContent().sections)).toBe(
            '[{"heading":"H1","body":"a • b"},' +
            '{"type":"paragraph","text":"note","size":"sm","bold":true},' +
            '{"type":"spacer","size":"lg"},' +
            '{"type":"separator","label":"Details"},' +
            '{"heading":"H2","body":"text"}]'
        );
    });

    test('defaults: md paragraph without bold/italic keys, md spacer, unlabelled separator', () => {
        const card = new CardView('c', 'T').addParagraph('p').addSpacer().addSeparator('   ');
        expect(card.getContent().sections).toEqual([
            { type: 'paragraph', text: 'p', size: 'md' },
            { type: 'spacer', size: 'md' },
            { type: 'separator' }
        ]);
    });

    test('rejects a blank paragraph and unknown sizes', () => {
        const card = new CardView('c', 'T');
        expect(() => card.addParagraph('  ')).toThrow(InvalidParameterError);
        expect(() => card.addParagraph('p', { size: 'xxl' as never })).toThrow(InvalidParameterError);
        expect(() => card.addSpacer('xl' as never)).toThrow(InvalidParameterError);
    });

    test('a paragraph alone is content; a spacer or a separator alone is not', () => {
        expect(() => new CardView('c', 'T').addParagraph('only text').build()).not.toThrow();
        expect(() => new CardView('c', 'T').addSpacer().build()).toThrow(/at least a description, stat, or section/);
        expect(() => new CardView('c', 'T').addSeparator('x').build()).toThrow(/at least a description, stat, or section/);
    });

    test('clearSections drops the layout elements too', () => {
        const card = new CardView('c', 'T').addSection('H', 'b').addSpacer().clearSections();
        expect(card.getContent().sections).toEqual([]);
    });
});
