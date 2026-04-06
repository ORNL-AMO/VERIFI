import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportsDataCheckComponent } from './facility-reports-data-check.component';

describe('FacilityReportsDataCheckComponent', () => {
  let component: FacilityReportsDataCheckComponent;
  let fixture: ComponentFixture<FacilityReportsDataCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportsDataCheckComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportsDataCheckComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
