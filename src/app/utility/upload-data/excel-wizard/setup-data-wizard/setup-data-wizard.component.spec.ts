import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupDataWizardComponent } from './setup-data-wizard.component';

describe('SetupDataWizardComponent', () => {
  let component: SetupDataWizardComponent;
  let fixture: ComponentFixture<SetupDataWizardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SetupDataWizardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupDataWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
