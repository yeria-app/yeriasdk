import { BaseView } from './base-view';
import { ReaderElement, MarkdownPage } from '../types';
import { marked } from 'marked';
import { InvalidParameterError, MarkdownParseError } from '../errors';
import sanitizeHtmlLib from 'sanitize-html';

export interface ReaderContent {
    title: string;
    intro: string;
    elements: ReaderElement[];
}

/**
 * Sanitizes HTML using sanitize-html to prevent XSS attacks
 * More secure than regex-based sanitization with comprehensive protection
 */
const sanitizeHtml = (html: string): string => {
    return sanitizeHtmlLib(html, {
        allowedTags: [
            'p', 'br', 'strong', 'em', 'u', 'i', 'b',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'a', 'blockquote', 'code', 'pre',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'hr', 'div', 'span'
        ],
        allowedAttributes: {
            'a': ['href', 'title'],
            '*': ['class', 'id']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesByTag: {
            'a': ['http', 'https', 'mailto']
        },
        // Disallow data attributes to prevent data: URL attacks
        allowedClasses: {},
        disallowedTagsMode: 'discard',
        // Enforce strict filtering
        enforceHtmlBoundary: true
    });
};

export class ReaderView extends BaseView {
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'Reader',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title: title,
            intro: '',
            elements: []
        } as ReaderContent;
    }

    /**
     * Définit l'introduction
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Ajoute un paragraphe
     */
    addParagraph(text: string): this {
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            throw new InvalidParameterError('text', text, 'Paragraph text cannot be empty');
        }

        (this.content as ReaderContent).elements.push({
            type: 'paragraph',
            text: trimmed
        });
        return this;
    }

    /**
     * Ajoute une image
     */
    addImage(url: string, alt?: string, caption?: string): this {
        const trimmedUrl = url.trim();
        if (trimmedUrl.length === 0) {
            throw new InvalidParameterError('url', url, 'Image URL cannot be empty');
        }

        const imageElement: ReaderElement = {
            type: 'image',
            url: trimmedUrl
        };

        if (alt) {
            imageElement.alt = alt;
        }

        if (caption) {
            imageElement.caption = caption;
        }

        (this.content as ReaderContent).elements.push(imageElement);
        return this;
    }

    /**
     * Ajoute un sous-titre
     */
    addSubTitle(text: string): this {
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            throw new InvalidParameterError('text', text, 'Subtitle text cannot be empty');
        }

        (this.content as ReaderContent).elements.push({
            type: 'subtitle',
            text: trimmed
        });
        return this;
    }

    /**
     * Ajoute du contenu Markdown
     */
    addMarkdown(markdownText: string, options: { sanitize?: boolean } = {}): this {
        const { sanitize = true } = options;

        try {
            const parsed = marked.parse(markdownText);
            const htmlContent = typeof parsed === 'string' ? parsed : parsed.toString();

            const page: MarkdownPage = {
                content: sanitize ? sanitizeHtml(htmlContent) : htmlContent,
                raw: markdownText,
                sanitized: sanitize
            };

            const elements = (this.content as ReaderContent).elements;
            const existingMarkdown = elements.find(
                (element): element is ReaderElement & { type: 'markdown' } => element.type === 'markdown'
            );

            if (!existingMarkdown) {
                elements.push({
                    type: 'markdown',
                    pages: [page]
                });
            } else {
                if (!existingMarkdown.pages) {
                    existingMarkdown.pages = [];
                }

                existingMarkdown.pages.push(page);
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            throw new MarkdownParseError(this.id, err);
        }

        return this;
    }

    /**
     * Ajoute une liste
     */
    addListField(items: string[], ordered: boolean = false): this {
        if (!Array.isArray(items)) {
            throw new InvalidParameterError('items', items, 'List items must be an array');
        }

        const trimmedItems = items.map(item => item.trim());
        const listElement: ReaderElement = {
            type: 'list',
            items: trimmedItems,
            ordered
        };

        (this.content as ReaderContent).elements.push(listElement);
        return this;
    }

    /**
     * Ajoute un lien
     */
    addLink(url: string, text: string, description?: string): this {
        const trimmedUrl = url.trim();
        const trimmedText = text.trim();

        if (trimmedUrl.length === 0) {
            throw new InvalidParameterError('url', url, 'Link URL cannot be empty');
        }

        if (trimmedText.length === 0) {
            throw new InvalidParameterError('text', text, 'Link text cannot be empty');
        }

        const linkElement: ReaderElement = {
            type: 'link',
            url: trimmedUrl,
            text: trimmedText
        };

        if (description) {
            linkElement.description = description;
        }

        (this.content as ReaderContent).elements.push(linkElement);
        return this;
    }

    /**
     * Ajoute un tableau
     */
    addTable(headers: string[], rows: string[][]): this {
        if (!Array.isArray(headers) || !Array.isArray(rows)) {
            throw new InvalidParameterError('table data', { headers, rows }, 'Headers and rows must be arrays');
        }

        const tableElement: ReaderElement = {
            type: 'table',
            headers,
            rows
        };

        (this.content as ReaderContent).elements.push(tableElement);
        return this;
    }

    /**
     * Ajoute un bloc de code
     */
    addCodeBlock(code: string, language?: string): this {
        const codeElement: ReaderElement = {
            type: 'code',
            code
        };

        if (language) {
            codeElement.language = language;
        }

        (this.content as ReaderContent).elements.push(codeElement);
        return this;
    }

    /**
     * Ajoute une citation
     */
    addQuote(text: string, author?: string, source?: string): this {
        const quoteElement: ReaderElement = {
            type: 'quote',
            text
        };

        if (author) {
            quoteElement.author = author;
        }

        if (source) {
            quoteElement.source = source;
        }

        (this.content as ReaderContent).elements.push(quoteElement);
        return this;
    }

    /**
     * Ajoute un séparateur
     */
    addSeparator(): this {
        (this.content as ReaderContent).elements.push({
            type: 'separator'
        });
        return this;
    }

    /**
     * Ajoute un élément personnalisé
     */
    addCustomElement(type: string, data: Record<string, unknown>): this {
        const trimmedType = type.trim();
        if (trimmedType.length === 0) {
            throw new InvalidParameterError('type', type, 'Custom element type cannot be empty');
        }

        (this.content as ReaderContent).elements.push({
            type: 'custom',
            kind: trimmedType,
            data: { ...data }
        });
        return this;
    }

    /**
     * Obtient les éléments par type
     */
    getElementsByType(type: ReaderElement['type']): ReaderElement[] {
        return (this.content as ReaderContent).elements.filter(element => element.type === type);
    }

    /**
     * Supprime un élément par index
     */
    removeElement(index: number): boolean {
        const elements = (this.content as ReaderContent).elements;
        if (index >= 0 && index < elements.length) {
            elements.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Insère un élément à un index spécifique
     */
    insertElement(index: number, element: ReaderElement): boolean {
        const elements = (this.content as ReaderContent).elements;
        if (index >= 0 && index <= elements.length) {
            elements.splice(index, 0, element);
            return true;
        }
        return false;
    }
} 
