import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LpgComponent } from './lpg.component';

describe('LpgComponent', () => {
  let component: LpgComponent;
  let fixture: ComponentFixture<LpgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LpgComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LpgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
