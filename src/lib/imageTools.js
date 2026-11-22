// Client-side image preparation. Modern phone photos are 3-10 MB; resizing to
// ~1600 px and re-encoding as JPEG makes uploads 10-20x smaller and far more
// reliable on mobile data. Falls back to the original file if anything fails.

export const MAX_PICKED_BYTES = 25 * 1024 * 1024; // what we accept from the picker, before resizing

export async function resizeImage(file, { maxSide = 1600, quality = 0.82 } = {}) {
  try {
    if (!file || !file.type.startsWith('image/')) return file;
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));

    // Small already? Keep the original rather than re-compressing.
    if (scale === 1 && file.size <= 600 * 1024) {
      bitmap.close?.();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.fillStyle = '#fff'; // flatten transparent PNGs onto white for JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file; // never make it bigger

    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

// Run `task(item, index)` over items with at most `limit` in flight.
export async function runPool(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { ok: true, value: await task(items[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
