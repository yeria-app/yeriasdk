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

/**
 * Builds a Message SGUI view — a titled notice/dialog with a severity and up to
 * two actions.
 *
 * `setBody`/`setIntro`/`setSeverity` set the content and tone; `setPrimaryAction`
 * and `setSecondaryAction` (aliased by `submitButton`) define the confirm/cancel
 * buttons, and `setDismissible` controls whether it can be closed without acting.
 *
 * Extends {@link BaseView}; instantiated by the YeriaApp/YeriaUI factory,
 * populated with these builders, then serialized to a JSON view description and
 * signed into a v3 envelope by `serve()`.
 */
export class MessageView extends BaseView {

    static fromJson(json: Record<string, unknown>): MessageView {
        return MessageView.fromJsonAs(MessageView, 'Message', json);
    }
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
     * Sets the introduction text
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Sets the main body of the message
     */
    setBody(body: string): this {
        if (!body || body.trim().length === 0) {
            throw new InvalidParameterError('body', body, 'Message body cannot be empty');
        }

        (this.content as MessageContent).body = body.trim();
        return this;
    }

    /**
     * Sets the message severity (info, success, warning, error)
     */
    setSeverity(severity: MessageSeverity): this {
        (this.content as MessageContent).severity = severity;
        return this;
    }

    /**
     * Configures the primary action (OK)
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
     * Compatibility alias for the legacy API
     */
    submitButton(text: string, method: HttpMethod = 'POST', confirmMessage?: string): this {
        return this.setPrimaryAction(text, method, confirmMessage);
    }

    /**
     * Configures the secondary action (Cancel / Reject)
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
     * Removes the secondary action if it exists
     */
    clearSecondaryAction(): this {
        (this.content as MessageContent).cancel = undefined;
        return this;
    }

    /**
     * Sets whether the message can be dismissed without acting
     */
    setDismissible(dismissible: boolean = true): this {
        (this.content as MessageContent).canDismiss = dismissible;
        return this;
    }

    /**
     * Adds message-specific metadata
     */
    setMetadata(metadata: Record<string, unknown>): this {
        (this.content as MessageContent).meta = { ...metadata };
        return this;
    }

}
