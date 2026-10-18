import { TestBed } from '@angular/core/testing';
import { buildPredictorInventory } from '../predictor-inventory.models';
import { inventoryWorkspace } from '../predictor-inventory.testing';
import { PredictorDirectoryComponent } from './predictor-directory.component';

describe('Predictor directory intent boundaries', () => {
  it('keeps opening, previewing, selecting and station setup as separate keyboard-accessible controls', () => {
    const workspace = inventoryWorkspace(3);
    TestBed.configureTestingModule({ imports: [PredictorDirectoryComponent] });
    const fixture = TestBed.createComponent(PredictorDirectoryComponent);
    fixture.componentRef.setInput('entries', buildPredictorInventory(workspace.predictorCards(), workspace.weatherStationGroups(), workspace.facility()!, 'ready'));
    fixture.componentRef.setInput('canAct', true); fixture.componentRef.setInput('selecting', true); fixture.componentRef.setInput('previewGuid', 'p1');
    const action = vi.fn(), preview = vi.fn(), selection = vi.fn(), station = vi.fn();
    fixture.componentInstance.action.subscribe(action); fixture.componentInstance.previewSelected.subscribe(preview);
    fixture.componentInstance.selectionChanged.subscribe(selection); fixture.componentInstance.stationOpened.subscribe(station); fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-browse-id="p1"]').click(); expect(action).toHaveBeenCalledWith({ guid: 'p1', action: 'settings' });
    fixture.nativeElement.querySelector('[aria-label="Preview p1"]').click(); expect(preview).toHaveBeenCalledWith('p1'); expect(action).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[aria-label="Preview p1"]').getAttribute('aria-pressed')).toBe('true');
    fixture.nativeElement.querySelector('[aria-label="Select p2"]').click(); expect(selection).toHaveBeenCalledWith({ guid: 'p2', selected: true });
    fixture.nativeElement.querySelector('.predictor-directory__station button').click(); expect(station).toHaveBeenCalledWith('station:KORD');
  });
});
