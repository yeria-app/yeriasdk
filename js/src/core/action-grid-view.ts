import { BaseActionView } from './base/base-action-view';
import { ActionConfig } from '../types';
import { InvalidParameterError } from '../errors';

export interface ActionGridContent {
    title?: string;
    intro?: string;
    actions: ActionConfig[];
    columns?: number;
    spacing?: number;
}

export class ActionGridView extends BaseActionView {
    constructor(viewId: string, title: string, processId?: string) {
        super({
            id: viewId,
            type: 'ActionGrid',
            processId,
            metadata: {
                version: '1.0.0',
                createdAt: new Date()
            }
        });

        this.content = {
            title: title,
            intro: '',
            actions: this.actions,  // Référence aux actions de BaseActionView
            columns: 2,
            spacing: 16
        } as ActionGridContent;
    }

    /**
     * Définit le titre de la grille d'actions
     */
    setTitle(title: string): this {
        (this.content as ActionGridContent).title = title;
        return this;
    }

    /**
     * Définit l'introduction de la grille d'actions
     */
    setIntro(intro: string): this {
        return this.setIntroText('intro', intro);
    }

    /**
     * Définit le nombre de colonnes
     */
    setColumns(columns: number): this {
        if (columns < 1 || columns > 6) {
            throw new InvalidParameterError('columns', columns, 'Columns must be between 1 and 6');
        }
        (this.content as ActionGridContent).columns = columns;
        return this;
    }

    /**
     * Définit l'espacement entre les éléments
     */
    setSpacing(spacing: number): this {
        if (spacing < 0) {
            throw new InvalidParameterError('spacing', spacing, 'Spacing must be non-negative');
        }
        (this.content as ActionGridContent).spacing = spacing;
        return this;
    }

    /**
     * Synchronize actions array to content (required by BaseActionView)
     */
    protected syncActionsToContent(): void {
        (this.content as ActionGridContent).actions = this.actions;
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
     * Obtient le nombre de colonnes
     */
    getColumns(): number {
        return (this.content as ActionGridContent).columns || 2;
    }

    /**
     * Obtient l'espacement
     */
    getSpacing(): number {
        return (this.content as ActionGridContent).spacing || 16;
    }

    /**
     * Vérifie si la grille a des actions
     */
    hasActions(): boolean {
        return this.actions.length > 0;
    }
}
