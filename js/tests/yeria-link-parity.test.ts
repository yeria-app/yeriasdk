import { readFileSync } from 'fs';
import path from 'path';

import { YeriaLink } from '../src';

interface YeriaLinkVector {
    name: string;
    link: string;
    valid: boolean;
}

const fixturePath = path.resolve(
    __dirname,
    '../../tests/fixtures/yeria_link_validation.json'
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    vectors: YeriaLinkVector[];
};

describe('YeriaLink shared parser parity golden', () => {
    test.each(fixture.vectors)('$name', ({ link, valid }) => {
        expect(YeriaLink.isValid(link)).toBe(valid);
    });
});
