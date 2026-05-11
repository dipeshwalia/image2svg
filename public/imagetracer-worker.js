/**
 * ImageTracer Web Worker
 *
 * Runs imagetracerjs in a background thread to prevent UI freezing.
 * The library is loaded from CDN inside the worker context.
 */

/* eslint-disable no-restricted-globals */
let ImageTracer = null;
let loading = null;

function loadLibrary() {
  if (ImageTracer) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    try {
      importScripts("https://cdn.jsdelivr.net/npm/imagetracerjs@1.2.6/imagetracer_v1.2.6.js");
      ImageTracer = self.ImageTracer;
      resolve();
    } catch (err) {
      reject(err);
    }
  });
  return loading;
}

self.onmessage = async function (e) {
  const { imageData, options, id } = e.data;

  try {
    await loadLibrary();

    const start = performance.now();
    const svg = ImageTracer.imagedataToSVG(imageData, options);
    const timeMs = Math.round(performance.now() - start);

    self.postMessage({ id, svg, timeMs });
  } catch (err) {
    self.postMessage({ id, error: err.message || "ImageTracer failed" });
  }
};
