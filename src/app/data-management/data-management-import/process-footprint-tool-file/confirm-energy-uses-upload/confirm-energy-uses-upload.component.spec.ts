import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmEnergyUsesUploadComponent } from './confirm-energy-uses-upload.component';

describe('ConfirmEnergyUsesUploadComponent', () => {
  let component: ConfirmEnergyUsesUploadComponent;
  let fixture: ComponentFixture<ConfirmEnergyUsesUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfirmEnergyUsesUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmEnergyUsesUploadComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
