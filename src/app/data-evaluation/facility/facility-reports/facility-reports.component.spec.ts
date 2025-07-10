import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportsComponent } from './facility-reports.component';

describe('FacilityReportsComponent', () => {
  let component: FacilityReportsComponent;
  let fixture: ComponentFixture<FacilityReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
