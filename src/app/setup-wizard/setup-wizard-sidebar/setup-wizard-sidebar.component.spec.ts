import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupWizardSidebarComponent } from './setup-wizard-sidebar.component';

describe('SetupWizardSidebarComponent', () => {
  let component: SetupWizardSidebarComponent;
  let fixture: ComponentFixture<SetupWizardSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupWizardSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SetupWizardSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
