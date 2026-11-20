import { Injectable, InjectionToken, inject } from '@angular/core';
import { HomeTemplateBlueprint } from '@data/home/home-template-graph';
import { HOME_STARTERS, HomeOwner, HomeTemplate } from '@domain/home/home-dashboard';

/** Providers promise complete accepted compositions, including every symbolic chart definition. */
export interface CompleteHomeRecipe {
  readonly template: Exclude<HomeTemplate, 'blank'>;
  readonly label: string;
  readonly description: string;
  readonly complete: true;
  build(accountGuid: string, owner: HomeOwner): HomeTemplateBlueprint;
}
export const HOME_COMPLETE_RECIPES = new InjectionToken<readonly CompleteHomeRecipe[]>('Complete Home recipes', { providedIn: 'root', factory: () => [] });

@Injectable({ providedIn: 'root' })
export class HomeTemplateCatalog {
  private readonly recipes = inject(HOME_COMPLETE_RECIPES);
  readonly choices = [{ template: 'blank' as HomeTemplate, label: 'Blank', description: 'An empty layout. Add notes, internal shortcuts, or links to saved visualizations.' },
    ...this.recipes.filter(recipe => recipe.complete).map(({ template, label, description }) => ({ template, label, description }))];

  build(template: HomeTemplate, accountGuid: string, owner: HomeOwner): HomeTemplateBlueprint {
    if (template === 'blank') return { template, version: 1, dashboard: { version: 1, name: 'Blank', widgets: [], defaults: {}, visibility: 'always' }, charts: [] };
    const recipe = this.recipes.find(recipe => recipe.template === template && recipe.complete);
    if (!recipe) throw new Error('This complete Home template is not available. Choose an available template.');
    const blueprint = recipe.build(accountGuid, owner);
    if (blueprint.template !== template) throw new Error('The Home recipe does not match its catalog identity.');
    return structuredClone(blueprint);
  }

  /** Home6 may activate initialization only when all six complete recipes are available. */
  starterBlueprints(accountGuid: string, owner: HomeOwner): readonly HomeTemplateBlueprint[] | undefined {
    return HOME_STARTERS.every(template => this.recipes.some(recipe => recipe.complete && recipe.template === template))
      ? HOME_STARTERS.map(template => this.build(template, accountGuid, owner)) : undefined;
  }
}
