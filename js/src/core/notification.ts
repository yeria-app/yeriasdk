import { NotificationMessage, NotificationPayload } from '../types';
import { MissingRequiredParameterError } from '../errors';

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


