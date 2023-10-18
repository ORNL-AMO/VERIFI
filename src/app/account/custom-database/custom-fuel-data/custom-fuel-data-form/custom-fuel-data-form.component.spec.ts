import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomFuelDataFormComponent } from './custom-fuel-data-form.component';

describe('CustomFuelDataFormComponent', () => {
  let component: CustomFuelDataFormComponent;
  let fixture: ComponentFixture<CustomFuelDataFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomFuelDataFormComponent]
    });
    fixture = TestBed.createComponent(CustomFuelDataFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
