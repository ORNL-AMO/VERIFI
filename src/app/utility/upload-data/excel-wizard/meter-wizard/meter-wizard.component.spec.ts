import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterWizardComponent } from './meter-wizard.component';

describe('MeterWizardComponent', () => {
  let component: MeterWizardComponent;
  let fixture: ComponentFixture<MeterWizardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeterWizardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
