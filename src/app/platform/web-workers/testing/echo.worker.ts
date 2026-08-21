/// <reference lib="webworker" />

addEventListener('message', ({ data }: MessageEvent<unknown>) => {
  postMessage({ echo: data });
});

export {};
