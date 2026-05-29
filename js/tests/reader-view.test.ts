/**
 * Security tests for ReaderView HTML sanitization
 * Tests XSS prevention using sanitize-html
 */

import { ReaderView } from '../src/core/reader-view';

describe('ReaderView - XSS Prevention Tests', () => {
    let reader: ReaderView;

    beforeEach(() => {
        reader = new ReaderView('test-reader', 'Security Test');
    });

    describe('HTML Sanitization', () => {
        it('should remove script tags from markdown', () => {
            const maliciousMarkdown = `
# Hello
<script>alert('XSS')</script>
Normal content
            `;

            reader.addMarkdown(maliciousMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            expect(markdownElement).toBeDefined();
            expect(markdownElement.pages[0].content).not.toContain('<script>');
            expect(markdownElement.pages[0].content).not.toContain('alert');
        });

        it('should remove inline event handlers', () => {
            const maliciousMarkdown = `
<img src="x" onerror="alert('XSS')">
<div onclick="malicious()">Click me</div>
<a href="#" onmouseover="alert('XSS')">Hover</a>
            `;

            reader.addMarkdown(maliciousMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('onerror');
            expect(htmlContent).not.toContain('onclick');
            expect(htmlContent).not.toContain('onmouseover');
        });

        it('should block javascript: URLs', () => {
            const maliciousMarkdown = `
<a href="javascript:alert('XSS')">Click me</a>
[Link](javascript:alert('XSS'))
            `;

            reader.addMarkdown(maliciousMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('javascript:');
        });

        it('should block data: URLs', () => {
            const maliciousMarkdown = `
<a href="data:text/html,<script>alert('XSS')</script>">Link</a>
            `;

            reader.addMarkdown(maliciousMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            // data: URLs should be blocked
            expect(htmlContent).not.toContain('data:text/html');
        });

        it('should remove iframe tags', () => {
            const maliciousMarkdown = `
<iframe src="http://evil.com"></iframe>
<iframe src="javascript:alert('XSS')"></iframe>
            `;

            reader.addMarkdown(maliciousMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('<iframe');
            expect(htmlContent).not.toContain('</iframe>');
        });

        it('should remove style tags and attributes', () => {
            const maliciousMarkdown = `
<style>body { display: none; }</style>
<div style="background: url('javascript:alert(1)')">Content</div>
            `;

            reader.addMarkdown(maliciousMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('<style');
            expect(htmlContent).not.toContain('background:');
        });

        it('should remove form elements', () => {
            const maliciousMarkdown = `
<form action="http://evil.com">
    <input type="text" name="data">
    <button type="submit">Submit</button>
</form>
            `;

            reader.addMarkdown(maliciousMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('<form');
            expect(htmlContent).not.toContain('<input');
            expect(htmlContent).not.toContain('<button');
        });

        it('should allow safe HTML tags', () => {
            const safeMarkdown = `
# Heading 1
## Heading 2

**Bold text** and *italic text*

- List item 1
- List item 2

[Safe link](https://example.com)

\`\`\`javascript
const code = "example";
\`\`\`
            `;

            reader.addMarkdown(safeMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            // Should preserve safe tags
            expect(htmlContent).toContain('<h');
            expect(htmlContent).toContain('<strong>');
            expect(htmlContent).toContain('<em>');
            expect(htmlContent).toContain('<ul>');
            expect(htmlContent).toContain('<li>');
            expect(htmlContent).toContain('<a');
        });

        it('should allow safe attributes on links', () => {
            const markdownWithLinks = `
[Link with title](https://example.com "Example Site")
            `;

            reader.addMarkdown(markdownWithLinks);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).toContain('href=');
            expect(htmlContent).toContain('title=');
        });

        it('should respect sanitize option when set to false', () => {
            const htmlContent = `<p>Test content</p>`;

            reader.addMarkdown(htmlContent, { sanitize: false });

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            expect(markdownElement.pages[0].sanitized).toBe(false);
        });

        it('should sanitize by default', () => {
            const htmlContent = `<p>Test content</p>`;

            reader.addMarkdown(htmlContent);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            expect(markdownElement.pages[0].sanitized).toBe(true);
        });
    });

    describe('XSS Attack Vectors', () => {
        it('should block SVG-based XSS', () => {
            const svgAttack = `
<svg onload="alert('XSS')">
</svg>
<svg><script>alert('XSS')</script></svg>
            `;

            reader.addMarkdown(svgAttack);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('onload');
            expect(htmlContent).not.toContain('<svg');
        });

        it('should block meta refresh redirects', () => {
            const metaRefresh = `
<meta http-equiv="refresh" content="0;url=http://evil.com">
            `;

            reader.addMarkdown(metaRefresh);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('<meta');
        });

        it('should block object and embed tags', () => {
            const objectEmbed = `
<object data="http://evil.com/malware.swf"></object>
<embed src="http://evil.com/malware.swf">
            `;

            reader.addMarkdown(objectEmbed);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            expect(htmlContent).not.toContain('<object');
            expect(htmlContent).not.toContain('<embed');
        });

        it('should handle case variations in dangerous tags', () => {
            const caseVariations = `
<ScRiPt>alert('XSS')</sCrIpT>
<IFRAME src="evil.com"></IFRAME>
<OnErRoR="alert('XSS')">
            `;

            reader.addMarkdown(caseVariations);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content.toLowerCase();

            expect(htmlContent).not.toContain('script');
            expect(htmlContent).not.toContain('iframe');
            expect(htmlContent).not.toContain('onerror');
        });

        it('should handle encoded entities in dangerous patterns', () => {
            const encodedAttack = `
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">
            `;

            reader.addMarkdown(encodedAttack);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            const htmlContent = markdownElement.pages[0].content;

            // sanitize-html should remove onerror regardless of encoding
            expect(htmlContent).not.toContain('onerror');
        });
    });

    describe('Content Integrity', () => {
        it('should preserve valid markdown structure', () => {
            const validMarkdown = `
# Main Heading

This is a paragraph with **bold** and *italic* text.

## Subheading

1. Ordered list item 1
2. Ordered list item 2

- Unordered item
- Another item

> This is a blockquote

\`\`\`javascript
const code = "example";
console.log(code);
\`\`\`

[Valid link](https://example.com)
            `;

            reader.addMarkdown(validMarkdown);

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            expect(markdownElement).toBeDefined();
            expect(markdownElement.pages[0].content).toBeTruthy();
            expect(markdownElement.pages[0].raw).toEqual(validMarkdown);
        });

        it('should handle multiple markdown additions', () => {
            reader.addMarkdown('# Page 1');
            reader.addMarkdown('# Page 2');
            reader.addMarkdown('# Page 3');

            const json = reader.toJSON();
            const content = json.content as any;
            const markdownElement = content.elements.find((el: any) => el.type === 'markdown');

            expect(markdownElement.pages).toHaveLength(3);
        });
    });
});
