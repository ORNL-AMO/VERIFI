import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionModelMenuComponent } from './regression-model-menu.component';

describe('RegressionModelMenuComponent', () => {
  let component: RegressionModelMenuComponent;
  let fixture: ComponentFixture<RegressionModelMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegressionModelMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegressionModelMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
