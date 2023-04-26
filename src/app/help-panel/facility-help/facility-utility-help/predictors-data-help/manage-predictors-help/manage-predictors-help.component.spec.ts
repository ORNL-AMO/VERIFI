import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagePredictorsHelpComponent } from './manage-predictors-help.component';

describe('ManagePredictorsHelpComponent', () => {
  let component: ManagePredictorsHelpComponent;
  let fixture: ComponentFixture<ManagePredictorsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManagePredictorsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagePredictorsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
