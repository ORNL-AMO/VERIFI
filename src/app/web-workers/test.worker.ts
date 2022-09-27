/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  // const response = `worker response to ${data}`;
  console.log('called!!')
  setTimeout(() => {
    console.log('post!!');
    postMessage(data);
  }, 2000)
});