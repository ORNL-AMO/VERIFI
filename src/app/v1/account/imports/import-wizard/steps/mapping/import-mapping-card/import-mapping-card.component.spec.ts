import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UNMAPPED_FACILITY_TARGET } from '../../../import-mapping.models';
import { ImportMappingCardComponent } from './import-mapping-card.component';

describe('ImportMappingCardComponent', () => {
  let fixture: ComponentFixture<ImportMappingCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImportMappingCardComponent] });
    fixture = TestBed.createComponent(ImportMappingCardComponent);
    fixture.componentRef.setInput('card', { id: 'meter-1', label: 'Electricity', index: 1 });
    fixture.componentRef.setInput('destinations', [
      { id: 'unmapped', label: 'Unmapped' },
      { id: 'facility-1', facilityId: 'facility-1', label: 'Main Plant' }
    ]);
    fixture.detectChanges();
  });

  it('uses the compact drag pattern and themed move control without sample statistics', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.import-drag-card__drag')?.getAttribute('aria-label')).toBe('Drag Electricity');
    expect(element.querySelector('input[type="checkbox"]')?.getAttribute('aria-label')).toBe('Select Electricity');
    expect(element.querySelector('select')?.classList.contains('v1-select')).toBe(true);
    expect(element.textContent).not.toContain('Sample');
  });

  it('emits both facility and Unmapped destinations', () => {
    const component = new ImportMappingCardComponent();
    const emitted: Array<string | undefined> = [];
    component.moveRequested.subscribe(value => emitted.push(value));

    component.move('facility-1');
    component.move(UNMAPPED_FACILITY_TARGET);

    expect(emitted).toEqual(['facility-1', undefined]);
  });
});
