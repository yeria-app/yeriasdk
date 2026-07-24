import { BaseView } from './base-view';
import { CarouselContent, CarouselSettings, CarouselSlide, CardAction, HttpMethod } from '../types';
import { MissingRequiredParameterError, ElementNotFoundError } from '../errors';
import { YeriaLink } from './yeria-link';

// CarouselView organises multiple spotlight slides for mobile hero banners or promotional decks.

/**
 * Builds a Carousel SGUI view — a sequence of spotlight slides for hero banners
 * or promotional decks.
 *
 * `addSlide` (or `createSlide` + `addSlide`) appends slides, `addSlideAction`
 * attaches action buttons to a slide, and `setSettings` tunes autoplay, looping
 * and indicator behaviour.
 *
 * Extends {@link BaseView}; instantiated by the YeriaApp/YeriaUI factory,
 * populated with these builders, then serialized to a JSON view description and
 * signed into a v3 envelope by `serve()`.
 */
export class CarouselView extends BaseView {

    static fromJson(json: Record<string, unknown>): CarouselView {
        return CarouselView.fromJsonAs(CarouselView, 'Carousel', json);
    }
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'Carousel',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title,
            subtitle: '',
            slides: [],
            settings: {
                autoplay: false,
                intervalMs: 6000,
                loop: true,
                showIndicators: true
            }
        } as CarouselContent;
    }

    // Optional subtitle shown beneath the carousel heading.
    setSubtitle(subtitle: string): this {
        return this.setIntroText('subtitle', subtitle);
    }

    // Overrides default autoplay and indicator behaviour.
    setSettings(settings: CarouselSettings): this {
        (this.content as CarouselContent).settings = { ...settings };
        return this;
    }

    // Appends a prepared slide to the carousel sequence.
    addSlide(slide: CarouselSlide): this {
        if (!slide.id || !slide.title) {
            throw new MissingRequiredParameterError('slide id and title');
        }

        (this.content as CarouselContent).slides.push({
            ...slide,
            id: slide.id.trim(),
            title: slide.title.trim(),
            description: slide.description?.trim(),
            badge: slide.badge?.trim(),
            actions: slide.actions?.map(action => ({ ...action }))
        });

        return this;
    }

    // Builds a CarouselSlide object without adding it to the view.
    createSlide(
        id: string,
        title: string,
        description?: string,
        options: { imageUrl?: string; imageAlt?: string; badge?: string } = {}
    ): CarouselSlide {
        const slide: CarouselSlide = {
            id: id.trim(),
            title: title.trim(),
            description: description?.trim(),
            badge: options.badge?.trim(),
            image: options.imageUrl
                ? {
                    url: options.imageUrl.trim(),
                    alt: options.imageAlt?.trim()
                }
                : undefined
        };

        return slide;
    }

    // Pushes an action button for a given slide id.
    addSlideAction(
        slideId: string,
        text: string,
        method: HttpMethod = 'POST',
        options: { confirmMessage?: string; href?: string; icon?: string; variant?: CardAction['variant'] } = {}
    ): this {
        const slide = (this.content as CarouselContent).slides.find(item => item.id === slideId);
        if (!slide) {
            throw new ElementNotFoundError(0, slideId);  // Using slideId as identifier
        }

        if (!slide.actions) {
            slide.actions = [];
        }

        const action: CardAction = {
            text: text.trim(),
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

        slide.actions.push(action);
        return this;
    }

    clearSlides(): this {
        (this.content as CarouselContent).slides = [];
        return this;
    }

    // Exposes the assembled payload for advanced usage.
    getContent(): CarouselContent {
        return this.content as CarouselContent;
    }
}
