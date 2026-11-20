import { Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { HomeEditor } from '../home-editor.service';
import { HomeWidgetChoiceDraft, EMPTY_HOME_WIDGET_CHOICE } from '../home-widget-editing';
import { availableHomeCharts } from '../home-widget-view';

@Component({ selector: 'app-home-widget-adder', standalone: false, templateUrl: './widget-adder.component.html', styleUrls: ['./widget-adder.component.css'] })
export class HomeWidgetAdderComponent {
  readonly editor = inject(HomeEditor);
  readonly form = new FormGroup({ kind: new FormControl<HomeWidgetChoiceDraft['kind']>('note', { nonNullable: true }),
    recipe: new FormControl('', { nonNullable: true }), visualizationGuids: new FormControl<string[]>([], { nonNullable: true }), shortcutKeys: new FormControl<string[]>([], { nonNullable: true }) });
  readonly recipes = [{ key: 'reporting-energy-rolling', label: 'Energy rolling improvement · active for reporting' }, { key: 'reporting-water-rolling', label: 'Water rolling improvement · active for reporting' }];
  readonly choice = computed(() => this.editor.session()?.widgetChoice ?? EMPTY_HOME_WIDGET_CHOICE);
  readonly charts = computed(() => { const snapshot = this.editor.home.workspace.snapshot(); return snapshot ? availableHomeCharts(snapshot) : []; });
  readonly shortcuts = this.editor.home.shortcutChoices;
  readonly chartOptions = computed(() => this.charts().map(chart => ({ guid: chart.guid, label: chart.label, detail: chart.context })));
  readonly shortcutOptions = computed(() => this.shortcuts().map(choice => ({ guid: choice.key, label: choice.label })));
  readonly canAdd = computed(() => this.editor.canEdit() && (['note', 'actions', 'energy-goal', 'water-goal'].includes(this.choice().kind) || this.choice().kind === 'facility-progress' && this.editor.home.owner()?.kind === 'account'
    || this.choice().kind === 'built-in-chart' && this.recipes.some(recipe => recipe.key === this.choice().recipe)
    || this.choice().kind === 'visualization' && this.choice().visualizationGuids.length === 1 && this.charts().some(chart => chart.guid === this.choice().visualizationGuids[0])
    || this.choice().kind === 'shortcut' && this.choice().shortcutKeys.length === 1 && this.shortcuts().some(choice => choice.key === this.choice().shortcutKeys[0])));
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.editor.setWidgetChoice({ kind: this.form.controls.kind.value, visualizationGuids: this.form.controls.visualizationGuids.value, shortcutKeys: this.form.controls.shortcutKeys.value, ...(this.form.controls.kind.value === 'built-in-chart' ? { recipe: this.form.controls.recipe.value } : {}) }));
    effect(() => {
      const choice = this.choice(), enabled = this.editor.canEdit();
      this.form.setValue({ kind: choice.kind, recipe: choice.recipe ?? '', visualizationGuids: [...choice.visualizationGuids], shortcutKeys: [...choice.shortcutKeys] }, { emitEvent: false });
      enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false });
    });
  }
  add(): void {
    if (!this.canAdd()) return;
    const id = getNewIdbEntry().guid, base = { id, size: 'full' as const, visibility: 'always' as const }, choice = this.choice();
    if (choice.kind === 'built-in-chart') this.editor.addWidget({ ...base, kind: 'built-in-chart', reference: { kind: 'built-in', recipe: choice.recipe!, version: 1, owner: this.editor.home.owner()! }, inherit: [], overrides: {} });
    if (choice.kind === 'actions') this.editor.addWidget({ ...base, kind: 'actions', settings: { scope: 'owner' } });
    if (choice.kind === 'energy-goal' || choice.kind === 'water-goal') this.editor.addWidget({ ...base, kind: 'goal', binding: { kind: 'reporting', owner: this.editor.home.owner()!, category: choice.kind === 'energy-goal' ? 'energy' : 'water' } });
    if (choice.kind === 'facility-progress') this.editor.addWidget({ ...base, kind: 'table', settings: { view: 'facility-progress', measure: 'energy', categories: ['energy', 'water'], period: 'latest-result' } });
    if (choice.kind === 'note') this.editor.addWidget({ ...base, kind: 'note', text: '' });
    if (choice.kind === 'visualization') this.editor.addWidget({ ...base, kind: 'visualization', visualizationGuid: choice.visualizationGuids[0], inherit: [], overrides: {} });
    if (choice.kind === 'shortcut') this.editor.addWidget({ ...base, kind: 'shortcut', destination: this.shortcuts().find(target => target.key === choice.shortcutKeys[0])!.destination });
  }
  cancel(): void { this.editor.setWidgetChoice(EMPTY_HOME_WIDGET_CHOICE); }
}
