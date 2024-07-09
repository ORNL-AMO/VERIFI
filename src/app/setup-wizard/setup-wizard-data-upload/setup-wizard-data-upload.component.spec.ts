import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupWizardDataUploadComponent } from './setup-wizard-data-upload.component';

describe('SetupWizardDataUploadComponent', () => {
  let component: SetupWizardDataUploadComponent;
  let fixture: ComponentFixture<SetupWizardDataUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SetupWizardDataUploadComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SetupWizardDataUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
