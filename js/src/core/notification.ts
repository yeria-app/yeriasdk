import { NotificationMessage, NotificationPayload } from '../types';
import { MissingRequiredParameterError } from '../errors';

/**
 * Value object describing a notification to send to a specific user.
 *
 * Carries the target userId plus the message (title, body, optional link) and
 * serializes via `toJSON()` to the payload the platform signs and sends.
 * Constructed by callers; consumed by YeriaSigner.signNotification.
 */
export class Notification {
    private userId: string;
    private message: NotificationMessage;

    constructor(userId: string, title: string, body: string, link?: string) {
        if (!userId || !title || !body) {
            throw new MissingRequiredParameterError('userId, title, and body');
        }
        this.userId = userId;
        this.message = { title, body, link };
    }

    /**
     * Sets the optional in-app navigation link
     * @param link - Link URL (e.g., "/profile" or "app://view/123")
     * @returns this for chaining
     */
    setLink(link: string): this {
        this.message.link = link;
        return this;
    }

    /**
     * Returns the notification payload as JSON
     */
    toJSON(): NotificationPayload {
        return {
            userId: this.userId,
            message: this.message
        };
    }
}


