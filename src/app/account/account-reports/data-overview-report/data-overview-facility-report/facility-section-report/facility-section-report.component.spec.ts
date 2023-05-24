import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySectionReportComponent } from './facility-section-report.component';

describe('FacilitySectionReportComponent', () => {
  let component: FacilitySectionReportComponent;
  let fixture: ComponentFixture<FacilitySectionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilitySectionReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySectionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
