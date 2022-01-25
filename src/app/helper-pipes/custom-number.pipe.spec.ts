import { CustomNumberPipe } from './custom-number.pipe';

describe('CustomNumberPipe', () => {
  it('create an instance', () => {
    const pipe = new CustomNumberPipe();
    expect(pipe).toBeTruthy();
  });
});
