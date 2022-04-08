import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectFacilityAnalysisItemsComponent } from './select-facility-analysis-items.component';

describe('SelectFacilityAnalysisItemsComponent', () => {
  let component: SelectFacilityAnalysisItemsComponent;
  let fixture: ComponentFixture<SelectFacilityAnalysisItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectFacilityAnalysisItemsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectFacilityAnalysisItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
