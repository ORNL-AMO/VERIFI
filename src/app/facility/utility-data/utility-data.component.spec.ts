import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityDataComponent } from './utility-data.component';

describe('UtilityDataComponent', () => {
  let component: UtilityDataComponent;
  let fixture: ComponentFixture<UtilityDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityDataComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UtilityDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
