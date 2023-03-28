import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagePredictorsComponent } from './manage-predictors.component';

describe('ManagePredictorsComponent', () => {
  let component: ManagePredictorsComponent;
  let fixture: ComponentFixture<ManagePredictorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManagePredictorsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagePredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
