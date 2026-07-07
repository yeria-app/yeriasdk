import { BaseView } from './base-view';
import { MediaContent, MediaItem, MediaKind, MediaSource } from '../types';

// MediaView groups audio and video resources in a consistent playlist for mobile playback.

/**
 * Builds a Media SGUI view — an audio/video playlist for mobile playback.
 *
 * `addMediaItem` (or `createMedia` + `addMediaItem`) registers playable entries,
 * and `setSelectedItem` marks the one shown first in the player.
 *
 * Extends {@link BaseView}; instantiated by the YeriaApp/YeriaUI factory,
 * populated with these builders, then serialized to a JSON view description and
 * signed into a v3 envelope by `serve()`.
 */
export class MediaView extends BaseView {

    static fromJson(json: Record<string, unknown>): MediaView {
        return MediaView.fromJsonAs(MediaView, 'Media', json);
    }
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

    // Registers a ready-to-play media entry. `selected` is ignored here on
    // purpose — use setSelectedItem(id) so exactly one entry is ever selected.
    addMediaItem(item: MediaItem): this {
        if (!item.id || !item.kind || !item.sources || item.sources.length === 0) {
            throw new Error('Media item requires an id, type, and at least one source');
        }

        const { selected: _ignored, ...rest } = item;
        (this.content as MediaContent).items.push({
            ...rest,
            id: item.id.trim(),
            title: item.title?.trim(),
            description: item.description?.trim(),
            sources: item.sources.map(source => this.normalizeSource(source))
        });

        return this;
    }

    // Marks the entry shown first in the player. Clears `selected` on every
    // other item so only one is ever selected.
    setSelectedItem(id: string): this {
        const target = id.trim();
        const items = (this.content as MediaContent).items;
        let found = false;
        for (const it of items) {
            it.selected = it.id === target;
            if (it.selected) found = true;
        }
        if (!found) {
            throw new Error(`setSelectedItem: no media item with id "${target}"`);
        }
        return this;
    }

    // Builds a MediaItem (single source) without adding it to the playlist.
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
