import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportColumnCardView, ImportColumnLaneView } from '../../../import-column.models';
import { ImportColumnLaneComponent } from './import-column-lane.component';

describe('ImportColumnLaneComponent', () => {
  let fixture: ComponentFixture<ImportColumnLaneComponent>;
  const card: ImportColumnCardView = {
    id: 'electricity',
    header: 'Electricity',
    index: 1,
    target: 'Worksheet Columns',
    likelyDate: false
  };
  const lane: ImportColumnLaneView = {
    target: 'Meters',
    label: 'Meters',
    description: 'Utility readings.',
    icon: 'meter',
    cards: [],
    totalCount: 0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragDropModule, ImportColumnLaneComponent] });
    fixture = TestBed.createComponent(ImportColumnLaneComponent);
    fixture.componentInstance.lane = lane;
    fixture.componentInstance.connectedDropListIds = ['import-column-meters'];
    fixture.detectChanges();
  });

  it('renders a named empty drop target', () => {
    const dropzone = fixture.nativeElement.querySelector('[cdkDropList]');

    expect(dropzone.getAttribute('aria-label')).toBe('Meters columns');
    expect(fixture.nativeElement.querySelector('.import-column-lane--meters')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Drop columns here');
  });

  it('moves selected columns into the lane when the lane action is available', () => {
    const emitted = vi.fn();
    fixture.componentRef.setInput('selectedCount', 2);
    fixture.componentInstance.moveSelectedRequested.subscribe(emitted);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Move selected columns to Meters"]');
    expect(button.disabled).toBe(false);

    button.click();

    expect(emitted).toHaveBeenCalledWith('Meters');
  });

  it('requires exactly one selected column for the Date lane action', () => {
    fixture.componentRef.setInput('lane', { ...lane, target: 'Date', label: 'Date' });
    fixture.componentRef.setInput('selectedCount', 2);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Move selected columns to Date"]');
    expect(button.disabled).toBe(true);

    fixture.componentRef.setInput('selectedCount', 1);
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
  });

  it('emits a move when a card is dropped from another lane', () => {
    const emitted = vi.fn();
    fixture.componentInstance.columnDropped.subscribe(emitted);

    fixture.componentInstance.drop({
      previousContainer: { id: 'import-column-worksheet-columns' },
      container: { id: 'import-column-meters' },
      item: { data: card }
    } as CdkDragDrop<readonly unknown[]>);

    expect(emitted).toHaveBeenCalledWith({ itemId: card.id, target: 'Meters' });
  });

  it('ignores drops within the same lane', () => {
    const emitted = vi.fn();
    const container = { id: 'import-column-meters' };
    fixture.componentInstance.columnDropped.subscribe(emitted);

    fixture.componentInstance.drop({ previousContainer: container, container, item: { data: card } } as CdkDragDrop<readonly unknown[]>);

    expect(emitted).not.toHaveBeenCalled();
  });
});
