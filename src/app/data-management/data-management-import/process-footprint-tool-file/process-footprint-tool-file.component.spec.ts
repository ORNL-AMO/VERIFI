import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessFootprintToolFileComponent } from './process-footprint-tool-file.component';

describe('ProcessFootprintToolFileComponent', () => {
  let component: ProcessFootprintToolFileComponent;
  let fixture: ComponentFixture<ProcessFootprintToolFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessFootprintToolFileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessFootprintToolFileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
