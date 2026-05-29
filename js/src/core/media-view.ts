import { BaseView } from './base-view';
import { MediaContent, MediaItem, MediaKind, MediaSource } from '../types';

// MediaView groups audio and video resources in a consistent playlist for mobile playback.

export class MediaView extends BaseView {
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'Media',
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
        } as MediaContent;
    }

    // Optional lead text for the media playlist section.
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    // Registers a ready-to-play media entry.
    addMediaItem(item: MediaItem): this {
        if (!item.id || !item.kind || !item.sources || item.sources.length === 0) {
            throw new Error('Media item requires an id, type, and at least one source');
        }

        (this.content as MediaContent).items.push({
            ...item,
            id: item.id.trim(),
            title: item.title?.trim(),
            description: item.description?.trim(),
            sources: item.sources.map(source => this.normalizeSource(source))
        });

        return this;
    }

    createMedia(
        id: string,
        kind: MediaKind,
        src: string,
        options: { type?: string; title?: string; description?: string; poster?: string; autoplay?: boolean; loop?: boolean; controls?: boolean } = {}
    ): MediaItem {
        const primarySource = this.normalizeSource({ src, type: options.type });

        return {
            id: id.trim(),
            kind,
            title: options.title?.trim(),
            description: options.description?.trim(),
            poster: options.poster?.trim(),
            autoplay: options.autoplay,
            loop: options.loop,
            controls: options.controls ?? true,
            sources: [primarySource]
        };
    }

    clearItems(): this {
        (this.content as MediaContent).items = [];
        return this;
    }

    // Helper to inspect the assembled playlist.
    getContent(): MediaContent {
        return this.content as MediaContent;
    }

    private normalizeSource(source: MediaSource): MediaSource {
        const trimmedSrc = source.src.trim();
        if (!trimmedSrc) {
            throw new Error('Media source src cannot be empty');
        }

        return {
            src: trimmedSrc,
            type: source.type?.trim()
        };
    }
}
