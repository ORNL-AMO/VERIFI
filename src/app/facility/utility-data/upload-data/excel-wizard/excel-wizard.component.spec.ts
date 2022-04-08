import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelWizardComponent } from './excel-wizard.component';

describe('ExcelWizardComponent', () => {
  let component: ExcelWizardComponent;
  let fixture: ComponentFixture<ExcelWizardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExcelWizardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExcelWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
