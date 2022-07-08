import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityHomeSummaryComponent } from './facility-home-summary.component';

describe('FacilityHomeSummaryComponent', () => {
  let component: FacilityHomeSummaryComponent;
  let fixture: ComponentFixture<FacilityHomeSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityHomeSummaryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityHomeSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
