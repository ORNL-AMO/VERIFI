import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorsManagementComponent } from './predictors-management.component';

describe('PredictorsManagementComponent', () => {
  let component: PredictorsManagementComponent;
  let fixture: ComponentFixture<PredictorsManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictorsManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PredictorsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
