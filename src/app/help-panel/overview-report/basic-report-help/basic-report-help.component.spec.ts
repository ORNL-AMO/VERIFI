import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicReportHelpComponent } from './basic-report-help.component';

describe('BasicReportHelpComponent', () => {
  let component: BasicReportHelpComponent;
  let fixture: ComponentFixture<BasicReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BasicReportHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BasicReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
