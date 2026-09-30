import { BaseView } from './base-view';
import {
    CardContent,
    CardAction,
    CardImage,
    CardSection,
    CardStat,
    CardActionVariant,
    CardLayoutBlock,
    HttpMethod,
    ParagraphSize,
    SpacerSize
} from '../types';
import { InvalidParameterError, MissingRequiredParameterError } from '../errors';
import { YeriaLink } from './yeria-link';

// CardView is a compact "product sheet" view that highlights a single item with stats, sections and actions.

/**
 * Builds a Card SGUI view — a compact "product sheet" spotlighting a single item.
 *
 * Header, badge and image are set via `setIntro`/`setDescription`/`setBadge`/
 * `setImage`; `addStat`, `addSection` and `addAction` fill the highlight
 * metrics, body sections and footer buttons.
 *
 * Extends {@link BaseView}; instantiated by the YeriaApp/YeriaUI factory,
 * populated with these builders, then serialized to a JSON view description and
 * signed into a v3 envelope by `serve()`.
 */
export class CardView extends BaseView {

    static fromJson(json: Record<string, unknown>): CardView {
        return CardView.fromJsonAs(CardView, 'Card', json);
    }
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'Card',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title,
            badge: undefined,
            image: undefined,
            stats: [],
            sections: [],
            actions: [],
            meta: undefined
        } as CardContent;
    }

    // Ligne de contexte sous le titre.
    setIntro(intro: string): this {
        // Même contrat que partout ailleurs : un texte d'en-tête se pose ou ne
        // se pose pas. Stocker '' faisait réserver au renderer une ligne vide.
        return this.setIntroText('intro', intro);
    }

    /**
     * Nom historique de {@link setIntro}, conservé : la carte disait
     * `subtitle` là où les onze autres vues disent `intro`. Écrit la même clé.
     */
    setSubtitle(subtitle: string): this {
        return this.setIntro(subtitle);
    }

    // Provides the long-form description for the card body.
    setDescription(description: string): this {
        return this.setIntroText('description', description);
    }

    // Displays a compact badge (e.g., "Nouveau") above the title.
    setBadge(badge: string | undefined): this {
        (this.content as CardContent).badge = badge?.trim() || undefined;
        return this;
    }

    // Attaches a hero image to the card header.
    setImage(url: string, alt?: string): this {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            throw new InvalidParameterError('url', url, 'Image URL cannot be empty');
        }

        const image: CardImage = {
            url: trimmedUrl,
            alt: alt?.trim()
        };

        (this.content as CardContent).image = image;
        return this;
    }

    clearImage(): this {
        (this.content as CardContent).image = undefined;
        return this;
    }

    // Adds a key metric row (label/value) in the highlight area.
    /**
     * Names the stats block. Optional: with no heading the grid is drawn
     * bare, exactly as a section with no `heading` is. The client never
     * invents a title of its own.
     */
    setStatsHeading(heading: string): this {
        return this.setIntroText('statsHeading', heading);
    }

    addStat(label: string, value: string): this {
        const trimmedLabel = label.trim();
        const trimmedValue = value.trim();

        if (!trimmedLabel || !trimmedValue) {
            throw new MissingRequiredParameterError('label and value');
        }

        (this.content as CardContent).stats.push({
            label: trimmedLabel,
            value: trimmedValue
        } as CardStat);

        return this;
    }

    clearStats(): this {
        (this.content as CardContent).stats = [];
        return this;
    }

    // Inserts a descriptive section below the highlights.
    addSection(heading: string, body: string): this {
        const trimmedHeading = heading.trim();
        const trimmedBody = body.trim();

        if (!trimmedHeading || !trimmedBody) {
            throw new MissingRequiredParameterError('heading and body');
        }

        (this.content as CardContent).sections.push({
            heading: trimmedHeading,
            body: trimmedBody
        } as CardSection);
        return this;
    }

    /**
     * Free text among the sections — the form's `addParagraph`, drawn the
     * same way. Four relative sizes, bold, italic; nothing richer, a card is
     * not a document. Takes its place in `sections` in call order.
     */
    addParagraph(
        text: string,
        options: { size?: ParagraphSize; bold?: boolean; italic?: boolean } = {}
    ): this {
        if (typeof text !== 'string' || text.trim() === '')
            throw new InvalidParameterError('text', text, 'paragraph text must be a non-empty string');

        const size = options.size ?? 'md';
        if (!['xl', 'lg', 'md', 'sm'].includes(size))
            throw new InvalidParameterError('size', size, "size must be 'xl', 'lg', 'md' or 'sm'");

        const block: CardLayoutBlock = { type: 'paragraph', text: text.trim(), size };
        if (options.bold) block.bold = true;
        if (options.italic) block.italic = true;
        (this.content as CardContent).sections.push(block);
        return this;
    }

    /**
     * Vertical breathing space between two blocks — the form's `addSpacer`.
     * Three steps; the client decides what each one measures. It replaces the
     * spacing the client would otherwise put between the two blocks.
     */
    addSpacer(size: SpacerSize = 'md'): this {
        if (!['sm', 'md', 'lg'].includes(size))
            throw new InvalidParameterError('size', size, "size must be 'sm', 'md' or 'lg'");

        (this.content as CardContent).sections.push({ type: 'spacer', size });
        return this;
    }

    /**
     * Horizontal rule between two blocks, with an optional label — the
     * form's `addSeparator`. No id here: a card block is never submitted.
     */
    addSeparator(label?: string): this {
        const block: CardLayoutBlock = { type: 'separator' };
        const trimmed = label?.trim();
        if (trimmed) block.label = trimmed;
        (this.content as CardContent).sections.push(block);
        return this;
    }

    /** Removes the sections AND the layout elements placed among them. */
    clearSections(): this {
        (this.content as CardContent).sections = [];
        return this;
    }

    // Registers an action button displayed in the footer.
    addAction(
        text: string,
        method: HttpMethod = 'POST',
        options: { confirmMessage?: string; href?: string; icon?: string; variant?: CardActionVariant } = {}
    ): this {
        const trimmedText = text.trim();
        if (!trimmedText) {
            throw new InvalidParameterError('text', text, 'Action text cannot be empty');
        }

        const action: CardAction = {
            text: trimmedText,
            method,
            confirmMessage: options.confirmMessage,
            href: options.href
                ? YeriaLink.isValid(options.href)
                    ? options.href.trim()
                    : this.assertNavigationTarget('href', options.href, {
                    allowRelative: true,
                    allowViewId: false
                })
                : undefined,
            icon: options.icon?.trim(),
            variant: options.variant
        };

        (this.content as CardContent).actions.push(action);
        return this;
    }

    clearActions(): this {
        (this.content as CardContent).actions = [];
        return this;
    }

    // Stores arbitrary metadata the client may need.
    setMetadata(meta: Record<string, unknown>): this {
        (this.content as CardContent).meta = { ...meta };
        return this;
    }

    getContent(): CardContent {
        return this.content as CardContent;
    }
}
