import { BaseView } from './base-view';
import { TimelineContent, TimelineItem, TimelineStatus } from '../types';
import { MissingRequiredParameterError } from '../errors';

// TimelineView captures chronological progress such as onboarding steps or activity feeds.

export class TimelineView extends BaseView {
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'Timeline',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title,
            intro: '',
            items: []
        } as TimelineContent;
    }

    // Adds optional context text displayed before the timeline items.
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    // Persists a fully configured timeline entry.
    addItem(item: TimelineItem): this {
        if (!item.id || !item.title || !item.timestamp) {
            throw new MissingRequiredParameterError('timeline item id, title, and timestamp');
        }

        (this.content as TimelineContent).items.push({
            ...item,
            id: item.id.trim(),
            title: item.title.trim(),
            timestamp: item.timestamp.trim(),
            description: item.description?.trim()
        });

        return this;
    }

    addEvent(
        id: string,
        title: string,
        timestamp: string,
        options: { description?: string; status?: TimelineStatus; icon?: string } = {}
    ): this {
        return this.addItem({
            id,
            title,
            timestamp,
            description: options.description,
            status: options.status,
            icon: options.icon
        });
    }

    // Replaces all events at once, enforcing validation per entry.
    setItems(items: TimelineItem[]): this {
        (this.content as TimelineContent).items = [];
        items.forEach(item => this.addItem(item));
        return this;
    }

    clearItems(): this {
        (this.content as TimelineContent).items = [];
        return this;
    }

    // Gives access to the final serializable data.
    getContent(): TimelineContent {
        return this.content as TimelineContent;
    }
}
