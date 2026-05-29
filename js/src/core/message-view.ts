import { BaseView } from './base-view';
import { SubmitAction, HttpMethod } from '../types';
import { InvalidParameterError } from '../errors';

export type MessageSeverity = 'info' | 'success' | 'warning' | 'error';

export interface MessageContent {
    title: string;
    intro: string;
    body: string;
    severity: MessageSeverity;
    confirm: SubmitAction;
    cancel?: SubmitAction;
    canDismiss: boolean;
    meta?: Record<string, unknown>;
}

export class MessageView extends BaseView {
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'Message',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title,
            intro: '',
            body: '',
            severity: 'info',
            confirm: {
                text: 'OK',
                method: 'POST'
            },
            canDismiss: false
        } as MessageContent;
    }

    /**
     * Définit le texte d'introduction
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Définit le corps principal du message
     */
    setBody(body: string): this {
        if (!body || body.trim().length === 0) {
            throw new InvalidParameterError('body', body, 'Message body cannot be empty');
        }

        (this.content as MessageContent).body = body.trim();
        return this;
    }

    /**
     * Définit la sévérité du message (info, success, warning, error)
     */
    setSeverity(severity: MessageSeverity): this {
        (this.content as MessageContent).severity = severity;
        return this;
    }

    /**
     * Configure l'action principale (OK)
     */
    setPrimaryAction(text: string, method: HttpMethod = 'POST', confirmMessage?: string): this {
        if (!text || text.trim().length === 0) {
            throw new InvalidParameterError('text', text, 'Primary action text cannot be empty');
        }

        (this.content as MessageContent).confirm = {
            text: text.trim(),
            method,
            confirmMessage
        };

        return this;
    }

    /**
     * Alias de compatibilité avec l'ancienne API
     */
    submitButton(text: string, method: HttpMethod = 'POST', confirmMessage?: string): this {
        return this.setPrimaryAction(text, method, confirmMessage);
    }

    /**
     * Configure l'action secondaire (Cancel / Reject)
     */
    setSecondaryAction(text: string, method: HttpMethod = 'POST', confirmMessage?: string): this {
        if (!text || text.trim().length === 0) {
            throw new InvalidParameterError('text', text, 'Secondary action text cannot be empty');
        }

        (this.content as MessageContent).cancel = {
            text: text.trim(),
            method,
            confirmMessage
        };

        return this;
    }

    /**
     * Supprime l'action secondaire si elle existe
     */
    clearSecondaryAction(): this {
        (this.content as MessageContent).cancel = undefined;
        return this;
    }

    /**
     * Définit si le message peut être fermé sans action
     */
    setDismissible(dismissible: boolean = true): this {
        (this.content as MessageContent).canDismiss = dismissible;
        return this;
    }

    /**
     * Ajoute des métadonnées spécifiques au message
     */
    setMetadata(metadata: Record<string, unknown>): this {
        (this.content as MessageContent).meta = { ...metadata };
        return this;
    }

}
