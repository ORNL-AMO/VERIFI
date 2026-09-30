import { CdkDragHandle, DragDropModule } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImportColumnCardComponent } from './import-column-card.component';

describe('ImportColumnCardComponent', () => {
  let fixture: ComponentFixture<ImportColumnCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragDropModule, ImportColumnCardComponent] });
    fixture = TestBed.createComponent(ImportColumnCardComponent);
    fixture.componentRef.setInput('card', {
      id: 'date',
      header: 'Read Date',
      index: 0,
      target: 'Date',
      likelyDate: true
    });
    fixture.detectChanges();
  });

  it('provides labeled selection, drag, and non-drag move controls', () => {
    const element: HTMLElement = fixture.nativeElement;
    const dragHandle: HTMLButtonElement = fixture.debugElement.query(By.directive(CdkDragHandle)).nativeElement;
    const select = element.querySelector('select') as HTMLSelectElement;

    expect(element.querySelector('input[type="checkbox"]')?.getAttribute('aria-label')).toBe('Select Read Date');
    expect(dragHandle.getAttribute('aria-label')).toBe('Drag Read Date');
    expect(select.closest('label')?.textContent).toContain('Move Read Date to');
    expect(element.textContent).toContain('Likely date');
    expect(element.querySelector('[role="tooltip"]')).toBeNull();
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
