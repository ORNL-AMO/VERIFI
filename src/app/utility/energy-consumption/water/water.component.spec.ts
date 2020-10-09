import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterComponent } from './water.component';

describe('WaterComponent', () => {
  let component: WaterComponent;
  let fixture: ComponentFixture<WaterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WaterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WaterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
