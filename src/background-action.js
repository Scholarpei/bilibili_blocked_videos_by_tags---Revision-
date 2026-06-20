export function runInBackground(promise, onError = () => {}) {
  Promise.resolve(promise).catch(onError);
}
