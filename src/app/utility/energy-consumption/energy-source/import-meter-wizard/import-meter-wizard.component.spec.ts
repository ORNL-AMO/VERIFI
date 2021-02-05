import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMeterWizardComponent } from './import-meter-wizard.component';

describe('ImportMeterWizardComponent', () => {
  let component: ImportMeterWizardComponent;
  let fixture: ComponentFixture<ImportMeterWizardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportMeterWizardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportMeterWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
