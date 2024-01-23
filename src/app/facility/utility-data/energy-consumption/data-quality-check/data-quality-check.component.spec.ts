import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataQualityCheckComponent } from './data-quality-check.component';

describe('DataQualityCheckComponent', () => {
  let component: DataQualityCheckComponent;
  let fixture: ComponentFixture<DataQualityCheckComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DataQualityCheckComponent]
    });
    fixture = TestBed.createComponent(DataQualityCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
