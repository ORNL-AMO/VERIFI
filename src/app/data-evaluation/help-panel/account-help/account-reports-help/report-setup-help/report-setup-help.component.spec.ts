import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportSetupHelpComponent } from './report-setup-help.component';

describe('ReportSetupHelpComponent', () => {
  let component: ReportSetupHelpComponent;
  let fixture: ComponentFixture<ReportSetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportSetupHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportSetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
