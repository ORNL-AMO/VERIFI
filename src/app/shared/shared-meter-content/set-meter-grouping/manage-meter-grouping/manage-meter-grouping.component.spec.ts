import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageMeterGroupingComponent } from './manage-meter-grouping.component';

describe('ManageMeterGroupingComponent', () => {
  let component: ManageMeterGroupingComponent;
  let fixture: ComponentFixture<ManageMeterGroupingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ManageMeterGroupingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageMeterGroupingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
