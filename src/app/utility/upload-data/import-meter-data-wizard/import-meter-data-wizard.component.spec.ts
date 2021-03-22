import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMeterDataWizardComponent } from './import-meter-data-wizard.component';

describe('ImportMeterDataWizardComponent', () => {
  let component: ImportMeterDataWizardComponent;
  let fixture: ComponentFixture<ImportMeterDataWizardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportMeterDataWizardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportMeterDataWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
