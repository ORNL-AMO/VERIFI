import { TestBed } from '@angular/core/testing';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeAccountOwner, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { HomeEditor } from '../home-editor.service';
import { homeRecord, setupHome } from '../testing/home-testing';
import { HomeWidgetAdderComponent } from './widget-adder.component';

describe('Home widget addition', () => {
  it('adds an independently identified note to the protected draft without saving or creating charts', () => {
    const { store, snapshot } = setupHome(); store.publish({ ...snapshot, homeDashboards: [homeRecord('a')], homeOwners: [getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState(['a']))] });
    const editor = TestBed.inject(HomeEditor); editor.beginEdit();
    const fixture = TestBed.createComponent(HomeWidgetAdderComponent); fixture.detectChanges();
    fixture.componentInstance.add(); fixture.detectChanges(); fixture.componentInstance.add();
    const widgets = editor.session()?.definition?.widgets!;
    expect(widgets).toHaveLength(2); expect(new Set(widgets.map(widget => widget.id)).size).toBe(2); expect(widgets[0].kind).toBe('note');
    expect(editor.needsProtection()).toBe(true); expect(store.homeDashboards()[0].definition).toMatchObject({ widgets: [] }); expect(store.savedVisualizations()).toEqual([]);
  });
});
