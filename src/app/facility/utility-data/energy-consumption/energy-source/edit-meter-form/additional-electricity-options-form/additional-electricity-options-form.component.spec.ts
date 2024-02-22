import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalElectricityOptionsFormComponent } from './additional-electricity-options-form.component';

describe('AdditionalElectricityOptionsFormComponent', () => {
  let component: AdditionalElectricityOptionsFormComponent;
  let fixture: ComponentFixture<AdditionalElectricityOptionsFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdditionalElectricityOptionsFormComponent]
    });
    fixture = TestBed.createComponent(AdditionalElectricityOptionsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
