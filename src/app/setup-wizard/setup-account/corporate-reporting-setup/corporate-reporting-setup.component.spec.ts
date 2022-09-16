import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorporateReportingSetupComponent } from './corporate-reporting-setup.component';

describe('CorporateReportingSetupComponent', () => {
  let component: CorporateReportingSetupComponent;
  let fixture: ComponentFixture<CorporateReportingSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorporateReportingSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorporateReportingSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
