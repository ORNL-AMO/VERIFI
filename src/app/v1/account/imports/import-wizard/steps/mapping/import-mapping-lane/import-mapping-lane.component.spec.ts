import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportMappingLaneComponent } from './import-mapping-lane.component';

describe('ImportMappingLaneComponent', () => {
  let fixture: ComponentFixture<ImportMappingLaneComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImportMappingLaneComponent] });
    fixture = TestBed.createComponent(ImportMappingLaneComponent);
    fixture.componentRef.setInput('type', 'meter');
    fixture.componentRef.setInput('lane', {
      id: 'facility-1', facilityId: 'facility-1', label: 'Main Plant', description: 'Meter columns assigned here.',
      color: '#1f77b4', unmapped: false, cards: [], totalCount: 0
    });
    fixture.componentRef.setInput('destinations', []);
    fixture.detectChanges();
  });

  it('shows the facility accent, empty state, count, and selected move action', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('section')?.getAttribute('style')).toContain('--import-lane-color');
    expect(element.textContent).toContain('Drop columns here');
    expect(element.querySelector('button')?.textContent).toContain('Move here');
    expect((element.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('moves selected cards to the lane facility', () => {
    fixture.componentRef.setInput('selectedCount', 2);
    fixture.detectChanges();
    const emitted: Array<string | undefined> = [];
    fixture.componentInstance.moveSelectedRequested.subscribe(value => emitted.push(value));

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toEqual(['facility-1']);
  });
});
