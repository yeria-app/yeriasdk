import { BaseView } from '../base-view';
import { ActionConfig } from '../../types';
import { MissingRequiredParameterError } from '../../errors';

/**
 * Classe de base pour les vues d'actions (ActionList et ActionGrid)
 * Factoriser le code commun entre ActionListView et ActionGridView
 */
export abstract class BaseActionView extends BaseView {
    protected actions: ActionConfig[] = [];

    /**
     * Ajoute une action
     */
    addAction(
        code: string,
        title: string,
        description?: string,
        thumbnail?: string,
        disabled: boolean = false,
        metadata?: Record<string, unknown>
    ): this {
        if (!code || !title) {
            throw new MissingRequiredParameterError('code and title');
        }

        const action: ActionConfig = {
            code,
            title,
            desc: description,
            thumbnail,
            disabled,
            metadata
        };

        this.actions.push(action);
        return this;
    }

    /**
     * Ajoute plusieurs actions en une fois
     */
    addActions(actions: Array<{
        code: string;
        title: string;
        description?: string;
        thumbnail?: string;
        disabled?: boolean;
        metadata?: Record<string, unknown>;
    }>): this {
        actions.forEach(action => {
            this.addAction(
                action.code,
                action.title,
                action.description,
                action.thumbnail,
                action.disabled,
                action.metadata
            );
        });
        return this;
    }

    /**
     * Supprime une action par son code
     */
    removeAction(actionCode: string): boolean {
        const index = this.actions.findIndex(action => action.code === actionCode);

        if (index !== -1) {
            this.actions.splice(index, 1);
            return true;
        }

        return false;
    }

    /**
     * Met à jour une action existante
     */
    updateAction(actionCode: string, updates: Partial<ActionConfig>): boolean {
        const action = this.actions.find(a => a.code === actionCode);

        if (action) {
            Object.assign(action, updates);
            return true;
        }

        return false;
    }

    /**
     * Obtient une action par son code
     */
    getAction(actionCode: string): ActionConfig | undefined {
        return this.actions.find(action => action.code === actionCode);
    }

    /**
     * Obtient toutes les actions
     */
    getActions(): ActionConfig[] {
        return [...this.actions];
    }

    /**
     * Obtient les actions actives (non désactivées)
     */
    getActiveActions(): ActionConfig[] {
        return this.actions.filter(action => !action.disabled);
    }

    /**
     * Obtient le nombre d'actions
     */
    getActionCount(): number {
        return this.actions.length;
    }

    /**
     * Vérifie si une action existe
     */
    hasAction(actionCode: string): boolean {
        return this.actions.some(action => action.code === actionCode);
    }

    /**
     * Vide toutes les actions
     */
    clearActions(): void {
        this.actions = [];
    }

    /**
     * Abstract method to sync actions array to content
     * Child classes must implement this to update their specific content type
     */
    protected abstract syncActionsToContent(): void;

    /**
     * Filtre les actions selon un critère
     */
    filterActions(predicate: (action: ActionConfig) => boolean): ActionConfig[] {
        return this.actions.filter(predicate);
    }

    /**
     * Trie les actions selon un critère personnalisé
     */
    sortActions(compareFn: (a: ActionConfig, b: ActionConfig) => number): this {
        this.actions.sort(compareFn);
        this.syncActionsToContent();
        return this;
    }

    /**
     * Trie les actions par titre (ordre alphab étique)
     */
    sortByTitle(ascending: boolean = true): this {
        return this.sortActions((a, b) => {
            const comparison = a.title.localeCompare(b.title);
            return ascending ? comparison : -comparison;
        });
    }

    /**
     * Désactive toutes les actions
     */
    disableAllActions(): this {
        this.actions.forEach(action => {
            action.disabled = true;
        });
        return this;
    }

    /**
     * Active toutes les actions
     */
    enableAllActions(): this {
        this.actions.forEach(action => {
            action.disabled = false;
        });
        return this;
    }
}
