import { TestBed } from '@angular/core/testing';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeAccountOwner, homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { HomeEditor } from '../home-editor.service';
import { HomePrintState } from '../home-print-state.service';
import { homeRecord, setupHome } from '../testing/home-testing';
import { HomeWidgetBoardComponent } from './widget-board.component';

describe('Home widget order and print source', () => {
  it('uses draft order for editing and committed order for print without losing the draft', () => {
    const { store, snapshot } = setupHome();
    const widgets = ['a', 'b'].map(id => ({ id, kind: 'note' as const, text: id, size: 'half' as const, visibility: 'always' as const }));
    store.publish({ ...snapshot, homeDashboards: [{ ...homeRecord('board'), definition: homeDefinition(widgets) }], homeOwners: [getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState(['board']))] });
    const editor = TestBed.inject(HomeEditor); editor.beginEdit(); editor.moveWidget('b', 0);
    const fixture = TestBed.createComponent(HomeWidgetBoardComponent); fixture.detectChanges();
    const ids = () => [...fixture.nativeElement.querySelectorAll('[data-widget-id]')].map((card: HTMLElement) => card.dataset['widgetId']);
    expect(ids()).toEqual(['b', 'a']); TestBed.inject(HomePrintState).active.set(true); fixture.detectChanges(); expect(ids()).toEqual(['a', 'b']);
    TestBed.inject(HomePrintState).active.set(false); fixture.detectChanges(); expect(ids()).toEqual(['b', 'a']); expect(editor.needsProtection()).toBe(true);
  });
});
