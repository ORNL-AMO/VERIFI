import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupWizardBannerComponent } from './setup-wizard-banner.component';

describe('SetupWizardBannerComponent', () => {
  let component: SetupWizardBannerComponent;
  let fixture: ComponentFixture<SetupWizardBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetupWizardBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupWizardBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
