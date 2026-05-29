import { BaseView } from './base-view';
import { SubmitAction, QRConfig, HttpMethod } from '../types';
import { MissingRequiredParameterError, InvalidParameterError } from '../errors';

export interface QRDisplayContent {
    title: string;
    intro: string;
    submit?: SubmitAction;
    qrImage: string;
    qrTitle: string;
    qrDescription: string;
    qrConfig?: QRConfig;
}

export class QRDisplayView extends BaseView {
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'QRDisplay',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title,
            intro: '',
            submit: undefined,
            qrImage: '',
            qrTitle: '',
            qrDescription: ''
        } as QRDisplayContent;
    }

    /**
     * Définit l'introduction
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Defines the submit button for QR display actions
     * Convention: Mobile app POSTs action to {service.baseUrl}/{viewId}
     * Common use cases: Share, Export, etc.
     *
     * @param text - Button text (e.g., "Share", "Export")
     * @param method - HTTP method (default: POST)
     */
    submitButton(text: string, method: HttpMethod = 'POST'): this {
        (this.content as QRDisplayContent).submit = {
            text,
            method
        };

        return this;
    }

    /**
     * Sets the QR code to display (replaces any existing QR code)
     */
    setQRCode(
        qrImage: string,
        title: string,
        description: string,
        config?: QRConfig
    ): this {
        if (!qrImage || !title || !description) {
            throw new MissingRequiredParameterError('qrImage, title, and description');
        }

        // Validation de l'URL ou base64
        if (!(qrImage.startsWith('http') || qrImage.startsWith('data:image/'))) {
            throw new InvalidParameterError('qrImage', qrImage, 'Invalid QR image. Provide a valid URL or base64 string.');
        }

        (this.content as QRDisplayContent).qrImage = qrImage;
        (this.content as QRDisplayContent).qrTitle = title;
        (this.content as QRDisplayContent).qrDescription = description;
        (this.content as QRDisplayContent).qrConfig = config;

        return this;
    }

}