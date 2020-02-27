/**
 * @file utils
 * @author atom-yang
 */

export async function innerHeight(minHeight = 400, time = 0, timeout = 500, maxTime = 10) {
  const currentTime = time + 1;
  if (currentTime > maxTime) {
    return '100vh';
  }
  try {
    const height = document.querySelector('#app').clientHeight;
    if (height && height > minHeight) {
      return `${height + 100}px`;
    }
    throw new Error('invalid');
  } catch (e) {
    await new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
    return innerHeight(minHeight, currentTime);
  }
}

export function sendMessage(message = {}, origin = '*') {
  if (window.parent) {
    window.parent.postMessage({
      type: 'viewer',
      message
    }, origin);
  }
}
