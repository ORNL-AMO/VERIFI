import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataWizardHomeComponent } from './data-wizard-home.component';

describe('DataWizardHomeComponent', () => {
  let component: DataWizardHomeComponent;
  let fixture: ComponentFixture<DataWizardHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataWizardHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataWizardHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
