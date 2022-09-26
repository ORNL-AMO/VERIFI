import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupWizardHelpComponent } from './setup-wizard-help.component';

describe('SetupWizardHelpComponent', () => {
  let component: SetupWizardHelpComponent;
  let fixture: ComponentFixture<SetupWizardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetupWizardHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupWizardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
