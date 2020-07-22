import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NaturalGasComponent } from './natural-gas.component';

describe('NaturalGasComponent', () => {
  let component: NaturalGasComponent;
  let fixture: ComponentFixture<NaturalGasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NaturalGasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NaturalGasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
