import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicReportComponent } from './basic-report.component';

describe('BasicReportComponent', () => {
  let component: BasicReportComponent;
  let fixture: ComponentFixture<BasicReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BasicReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BasicReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
