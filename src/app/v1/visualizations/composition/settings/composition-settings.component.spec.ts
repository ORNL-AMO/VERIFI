import { TestBed } from '@angular/core/testing';
import { compositionFixture } from '@domain/visualizations/testing/composition-fixtures';
import { CompositionModule } from '../composition.module';
import { CompositionSettingsComponent } from './composition-settings.component';

describe('composition settings', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('hydrates without edits and emits typed hierarchy and percentage changes', () => {
    TestBed.configureTestingModule({ imports: [CompositionModule] });
    const fixture = TestBed.createComponent(CompositionSettingsComponent), component = fixture.componentInstance;
    const changes: unknown[] = []; component.requested.subscribe(value => changes.push(value));
    const { definition } = compositionFixture({ kind: 'sunburst', hierarchy: ['group', 'equipment'], values: 'absolute' });
    fixture.componentRef.setInput('definition', definition); fixture.detectChanges(); expect(changes).toEqual([]);
    component.form.controls.hierarchy.setValue('source/equipment');
    expect(changes.at(-1)).toEqual({ kind: 'sunburst', hierarchy: ['source', 'equipment'], values: 'absolute' });
    component.form.controls.values.setValue('percent'); expect(changes.at(-1)).toMatchObject({ values: 'percent' });
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges(); const count = changes.length;
    component.form.controls.values.setValue('absolute'); expect(changes).toHaveLength(count);
    fixture.destroy();
  });
});
