import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportsHelpComponent } from './facility-reports-help.component';

describe('FacilityReportsHelpComponent', () => {
  let component: FacilityReportsHelpComponent;
  let fixture: ComponentFixture<FacilityReportsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportsHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
