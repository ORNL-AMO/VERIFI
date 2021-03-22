import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialReportingFormComponent } from './financial-reporting-form.component';

describe('FinancialReportingFormComponent', () => {
  let component: FinancialReportingFormComponent;
  let fixture: ComponentFixture<FinancialReportingFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FinancialReportingFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FinancialReportingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
