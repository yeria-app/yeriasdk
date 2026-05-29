import { BaseActionView } from './base/base-action-view';
import { ActionConfig } from '../types';

export interface ActionListContent {
    title?: string;
    intro?: string;
    actions: ActionConfig[];
}

export class ActionListView extends BaseActionView {
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'ActionList',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title: title,
            intro: '',
            actions: this.actions  // Référence aux actions de BaseActionView
        } as ActionListContent;
    }

    /**
     * Définit le titre de la liste d'actions
     */
    setTitle(title: string): this {
        (this.content as ActionListContent).title = title;
        return this;
    }

    /**
     * Définit l'introduction de la liste d'actions
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Synchronize actions array to content (required by BaseActionView)
     */
    protected syncActionsToContent(): void {
        (this.content as ActionListContent).actions = this.actions;
    }

    /**
     * Surcharge addAction pour synchroniser le content
     */
    override addAction(
        code: string,
        title: string,
        description?: string,
        thumbnail?: string,
        disabled: boolean = false,
        metadata?: Record<string, unknown>
    ): this {
        super.addAction(code, title, description, thumbnail, disabled, metadata);
        this.syncActionsToContent();
        return this;
    }

    /**
     * Surcharge removeAction pour synchroniser le content
     */
    override removeAction(actionCode: string): boolean {
        const result = super.removeAction(actionCode);
        if (result) {
            this.syncActionsToContent();
        }
        return result;
    }

    /**
     * Surcharge updateAction pour synchroniser le content
     */
    override updateAction(actionCode: string, updates: Partial<ActionConfig>): boolean {
        const result = super.updateAction(actionCode, updates);
        if (result) {
            this.syncActionsToContent();
        }
        return result;
    }

    /**
     * Vérifie si la liste a des actions
     */
    hasActions(): boolean {
        return this.actions.length > 0;
    }
}
