import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupWizardFooterComponent } from './setup-wizard-footer.component';

describe('SetupWizardFooterComponent', () => {
  let component: SetupWizardFooterComponent;
  let fixture: ComponentFixture<SetupWizardFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetupWizardFooterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupWizardFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
