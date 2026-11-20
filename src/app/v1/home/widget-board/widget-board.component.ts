import { Component, computed, inject } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { HomeEditor } from '../home-editor.service';
import { HomePrintState } from '../home-print-state.service';
import { HomeWidget } from '@domain/home/home-dashboard';
import { homeWidgetView } from '../home-widget-view';

@Component({ selector: 'app-home-widget-board', standalone: false, templateUrl: './widget-board.component.html', styleUrls: ['./widget-board.component.css'] })
export class HomeWidgetBoardComponent {
  readonly editor = inject(HomeEditor);
  readonly home = this.editor.home;
  readonly printing = inject(HomePrintState);
  readonly editing = computed(() => !this.printing.active() && this.editor.session()?.mode === 'edit');
  readonly shortcuts = this.home.shortcutChoices;
  readonly views = computed(() => {
    const session = this.editor.session(), snapshot = this.home.workspace.snapshot();
    if (this.editing() && session?.definition && snapshot)
      return session.definition.widgets.map(widget => homeWidgetView(session.baseline ?? { accountId: session.accountGuid }, widget, snapshot, session.repairPaths, this.shortcuts()));
    return this.home.widgetShells();
  });
  drop(event: CdkDragDrop<unknown>): void { if (this.editing() && this.editor.canEdit()) this.editor.moveWidget(event.item.data as string, event.currentIndex); }
  change(value: { readonly widget: HomeWidget; readonly repairPaths?: readonly string[] }): void { this.editor.updateWidget(value.widget, value.repairPaths); }
}
