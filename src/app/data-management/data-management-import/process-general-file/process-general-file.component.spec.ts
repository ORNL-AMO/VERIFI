import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessGeneralFileComponent } from './process-general-file.component';

describe('ProcessGeneralFileComponent', () => {
  let component: ProcessGeneralFileComponent;
  let fixture: ComponentFixture<ProcessGeneralFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessGeneralFileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessGeneralFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
