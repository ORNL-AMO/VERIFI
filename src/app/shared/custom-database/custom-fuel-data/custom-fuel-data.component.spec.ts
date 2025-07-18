import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomFuelDataComponent } from './custom-fuel-data.component';

describe('CustomFuelDataComponent', () => {
  let component: CustomFuelDataComponent;
  let fixture: ComponentFixture<CustomFuelDataComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomFuelDataComponent]
    });
    fixture = TestBed.createComponent(CustomFuelDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
