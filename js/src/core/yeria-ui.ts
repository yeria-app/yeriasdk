import { BaseView } from './base-view';
import { FormView } from './form-view';
import { ReaderView } from './reader-view';
import { ActionListView } from './action-list-view';
import { ActionGridView } from './action-grid-view';
import { IconGridView } from './icon-grid-view';
import { QRScanView } from './qr-scan-view';
import { QRDisplayView } from './qr-display-view';
import { MessageView } from './message-view';
import { CardView } from './card-view';
import { CarouselView } from './carousel-view';
import { TimelineView } from './timeline-view';
import { MediaView } from './media-view';
import { MapView } from './map-view';
import { ConfigurationError } from '../errors';
import { buildProviderError, ProviderErrorSpec, ProviderErrorBody } from './provider-error';

/**
 * `YeriaUI` — the provider-to-mobile VIEW FACTORY.
 *
 * A pure, KEYLESS, stateless builder namespace (a value object, like `Math` /
 * `JSON` — never instantiated): `createXxxView()` returns a fresh typed view
 * builder, and `fromJson(json)` rehydrates a typed view from wire JSON.
 * It holds NO private key and needs NO construction — import and use directly:
 *
 *   import { YeriaUI, YeriaApp } from '@numerum-tech/yeriasdk';
 *   const view = YeriaUI.createFormView(formId, title);
 *   view.addField(...);
 *   return app.serve(view);            // signing lives on `app` (holds the key)
 *
 * The build/sign split is by secret ownership: `YeriaUI` builds without any
 * credential; `app` (which holds the Ed25519 keypair) signs and talks to the
 * Yeria backend. Passing a `YeriaUI`-built view to `app.serve()` is a role
 * handoff, not a round-trip on one object.
 *
 * Not: `YeriaUI` never signs, verifies, or reaches the network — all of that
 * is on `YeriaApp`.
 */
export const YeriaUI = {
    createFormView(formId: string, title: string, processId?: string): FormView {
        return new FormView(formId, title, processId);
    },

    createReaderView(viewId: string, title: string, processId?: string): ReaderView {
        return new ReaderView(viewId, title, processId);
    },

    createActionListView(viewId: string, title: string, processId?: string): ActionListView {
        return new ActionListView(viewId, title, processId);
    },

    createActionGridView(viewId: string, title: string, processId?: string): ActionGridView {
        return new ActionGridView(viewId, title, processId);
    },

    createIconGridView(viewId: string, title: string, processId?: string): IconGridView {
        return new IconGridView(viewId, title, processId);
    },

    createQRScanView(viewId: string, title: string, processId?: string): QRScanView {
        return new QRScanView(viewId, title, processId);
    },

    createQRDisplayView(viewId: string, title: string, processId?: string): QRDisplayView {
        return new QRDisplayView(viewId, title, processId);
    },

    createMessageView(viewId: string, title: string, processId?: string): MessageView {
        return new MessageView(viewId, title, processId);
    },

    createCardView(viewId: string, title: string, processId?: string): CardView {
        return new CardView(viewId, title, processId);
    },

    createCarouselView(viewId: string, title: string, processId?: string): CarouselView {
        return new CarouselView(viewId, title, processId);
    },

    createTimelineView(viewId: string, title: string, processId?: string): TimelineView {
        return new TimelineView(viewId, title, processId);
    },

    createMediaView(viewId: string, title: string, processId?: string): MediaView {
        return new MediaView(viewId, title, processId);
    },

    createMapView(viewId: string, title: string, processId?: string): MapView {
        return new MapView(viewId, title, processId);
    },

    /**
     * Rehydrate a wire JSON payload (the output of `view.toJSON()`, e.g. a
     * static template or a DB-stored view) into a typed, validated view
     * instance. Dispatches on `json.type`. Pass the result to `app.serve()`.
     */
    fromJson(json: Record<string, unknown>): BaseView {
        const type = (json && typeof json === 'object') ? json['type'] : undefined;
        switch (type) {
            case 'Form': return FormView.fromJson(json);
            case 'Reader': return ReaderView.fromJson(json);
            case 'ActionList': return ActionListView.fromJson(json);
            case 'ActionGrid': return ActionGridView.fromJson(json);
            case 'IconGrid': return IconGridView.fromJson(json);
            case 'QRScan': return QRScanView.fromJson(json);
            case 'QRDisplay': return QRDisplayView.fromJson(json);
            case 'Message': return MessageView.fromJson(json);
            case 'Card': return CardView.fromJson(json);
            case 'Carousel': return CarouselView.fromJson(json);
            case 'Timeline': return TimelineView.fromJson(json);
            case 'Media': return MediaView.fromJson(json);
            case 'Map': return MapView.fromJson(json);
            default:
                throw new ConfigurationError(`fromJson: unknown or missing view type "${String(type)}"`);
        }
    },

    /**
     * Build an UNSIGNED provider error body `{ error: {...} }` to return to the
     * mobile client. Keyless — works with no `YeriaApp` (e.g. when the app
     * failed to construct). The mobile side reads `error.code` +
     * `error.invalid_params` and localizes by code. Use `app.serveError(spec)`
     * instead when you want the error signed.
     */
    error(spec: ProviderErrorSpec): ProviderErrorBody {
        return buildProviderError(spec);
    },
};
