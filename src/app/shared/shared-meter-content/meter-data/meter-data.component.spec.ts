import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDataComponent } from './meter-data.component';

describe('MeterDataComponent', () => {
  let component: MeterDataComponent;
  let fixture: ComponentFixture<MeterDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterDataComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MeterDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
