import { BaseView } from '../base-view';
import { ActionConfig } from '../../types';
import { MissingRequiredParameterError } from '../../errors';

/**
 * Abstract subclass of BaseView shared by the "action" family of views
 * (ActionListView, ActionGridView, IconGridView).
 *
 * Factors out the action/item handling common to those views: adding,
 * updating, removing, querying, sorting and enabling/disabling the list of
 * actions that each concrete view renders. Subclasses implement
 * syncActionsToContent() to project the shared actions array into their own
 * content shape.
 *
 * This class is ABSTRACT and is never instantiated directly; use one of the
 * concrete action views instead.
 *
 * Base class for the action views (ActionList and ActionGrid)
 * Factors out the code common to ActionListView and ActionGridView
 */
export abstract class BaseActionView extends BaseView {
    protected actions: ActionConfig[] = [];

    /**
     * Adds an action
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
     * Adds several actions at once
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
     * Removes an action by its code
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
     * Updates an existing action
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
     * Gets an action by its code
     */
    getAction(actionCode: string): ActionConfig | undefined {
        return this.actions.find(action => action.code === actionCode);
    }

    /**
     * Gets all actions
     */
    getActions(): ActionConfig[] {
        return [...this.actions];
    }

    /**
     * Gets the active actions (not disabled)
     */
    getActiveActions(): ActionConfig[] {
        return this.actions.filter(action => !action.disabled);
    }

    /**
     * Gets the number of actions
     */
    getActionCount(): number {
        return this.actions.length;
    }

    /**
     * Checks whether an action exists
     */
    hasAction(actionCode: string): boolean {
        return this.actions.some(action => action.code === actionCode);
    }

    /**
     * Clears all actions
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
     * Filters the actions by a predicate
     */
    filterActions(predicate: (action: ActionConfig) => boolean): ActionConfig[] {
        return this.actions.filter(predicate);
    }

    /**
     * Sorts the actions by a custom comparator
     */
    sortActions(compareFn: (a: ActionConfig, b: ActionConfig) => number): this {
        this.actions.sort(compareFn);
        this.syncActionsToContent();
        return this;
    }

    /**
     * Sorts the actions by title (alphabetical order)
     */
    sortByTitle(ascending: boolean = true): this {
        return this.sortActions((a, b) => {
            const comparison = a.title.localeCompare(b.title);
            return ascending ? comparison : -comparison;
        });
    }

    /**
     * Disables all actions
     */
    disableAllActions(): this {
        this.actions.forEach(action => {
            action.disabled = true;
        });
        return this;
    }

    /**
     * Enables all actions
     */
    enableAllActions(): this {
        this.actions.forEach(action => {
            action.disabled = false;
        });
        return this;
    }
}
