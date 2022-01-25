import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportPredictorsWizardComponent } from './import-predictors-wizard.component';

describe('ImportPredictorsWizardComponent', () => {
  let component: ImportPredictorsWizardComponent;
  let fixture: ComponentFixture<ImportPredictorsWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportPredictorsWizardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportPredictorsWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
