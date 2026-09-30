import { DragDropModule } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportColumnCardComponent } from './import-column-card.component';

describe('ImportColumnCardComponent', () => {
  let fixture: ComponentFixture<ImportColumnCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragDropModule, ImportColumnCardComponent] });
    fixture = TestBed.createComponent(ImportColumnCardComponent);
    fixture.componentInstance.card = {
      id: 'date',
      header: 'Read Date',
      index: 0,
      target: 'Date',
      likelyDate: true
    };
    fixture.detectChanges();
  });

  it('provides labeled selection, drag, and non-drag move controls', () => {
    expect(fixture.nativeElement.querySelector('input').getAttribute('aria-label')).toBe('Select Read Date');
    expect(fixture.nativeElement.querySelector('[cdkDragHandle]').getAttribute('aria-label')).toBe('Drag Read Date');
    expect(fixture.nativeElement.textContent).toContain('Likely date');
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
    const select = fixture.nativeElement.querySelector('select');
    expect(select.classList.contains('v1-select')).toBe(true);
    expect(select.querySelectorAll('option')).toHaveLength(4);
  });

  it('emits the selected destination', () => {
    const emitted = vi.fn();
    fixture.componentInstance.moveRequested.subscribe(emitted);

    fixture.componentInstance.move('Meters');

    expect(emitted).toHaveBeenCalledWith('Meters');
  });
});
