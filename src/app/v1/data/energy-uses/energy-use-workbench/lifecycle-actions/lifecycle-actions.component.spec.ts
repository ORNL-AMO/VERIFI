import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { energyUseItem } from '../../energy-uses.testing';
import { LifecycleActionsComponent } from './lifecycle-actions.component';
describe('Reviewed lifecycle action', () => {
  it('requires settled Setup and rechecks the reviewed saved item before a write', async () => {
    const actions = { setLifecycle: vi.fn(async () => {}) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: EnergyUseActionsService, useValue: actions }] });
    const fixture = TestBed.createComponent(LifecycleActionsComponent), component = fixture.componentInstance, item = energyUseItem();
    fixture.componentRef.setInput('item', item); fixture.detectChanges(); component.open(); expect(component.review()).toBeUndefined();
    fixture.componentRef.setInput('canAct', true); fixture.detectChanges(); component.open(); component.year.setValue(2024);
    fixture.componentRef.setInput('item', { ...item, notes: 'Elsewhere' }); fixture.detectChanges();
    await component.confirm(); expect(actions.setLifecycle).not.toHaveBeenCalled(); component.close();
    component.open(); component.year.setValue(2024); await component.confirm();
    expect(actions.setLifecycle).toHaveBeenCalledWith(expect.objectContaining({ energyUseGuid: item.guid }), expect.objectContaining({ notes: 'Elsewhere' }), 2024);
  });
});
