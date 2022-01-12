import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageReportTemplatesComponent } from './manage-report-templates.component';

describe('ManageReportTemplatesComponent', () => {
  let component: ManageReportTemplatesComponent;
  let fixture: ComponentFixture<ManageReportTemplatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageReportTemplatesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageReportTemplatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
