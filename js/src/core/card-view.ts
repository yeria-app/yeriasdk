import { BaseView } from './base-view';
import {
    CardContent,
    CardAction,
    CardImage,
    CardSection,
    CardStat,
    CardActionVariant,
    HttpMethod
} from '../types';
import { InvalidParameterError, MissingRequiredParameterError } from '../errors';

// CardView is a compact "product sheet" view that highlights a single item with stats, sections and actions.

export class CardView extends BaseView {
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
            subtitle: '',
            description: '',
            badge: undefined,
            image: undefined,
            stats: [],
            sections: [],
            actions: [],
            meta: undefined
        } as CardContent;
    }

    // Sets the small subtitle displayed under the main title.
    setSubtitle(subtitle: string): this {
        (this.content as CardContent).subtitle = subtitle.trim();
        return this;
    }

    // Provides the long-form description for the card body.
    setDescription(description: string): this {
        (this.content as CardContent).description = description.trim();
        return this;
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
            href: options.href?.trim(),
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
