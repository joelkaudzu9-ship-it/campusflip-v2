// Cloudinary delivery helpers.
// Inserting transformations after /upload/ makes Cloudinary resize and re-encode
// on the fly (f_auto = WebP/AVIF where supported, q_auto = smart quality), which
// cuts a typical 3 MB phone photo to tens of kilobytes on a listing card.
const UPLOAD_MARKER = '/image/upload/';

export function cfImage(url, width = 480) {
  if (!url || typeof url !== 'string') return url || null;
  const index = url.indexOf(UPLOAD_MARKER);
  if (index === -1 || !url.includes('res.cloudinary.com')) return url;
  const rest = url.slice(index + UPLOAD_MARKER.length);
  // Already transformed (first path segment holds transformation params, not a version/folder).
  if (/^(c_|w_|f_|q_|h_|ar_|g_)/.test(rest)) return url;
  const base = url.slice(0, index + UPLOAD_MARKER.length);
  return `${base}f_auto,q_auto,c_limit,w_${Math.round(width)}/${rest}`;
}

// Responsive srcset for cards and galleries.
export function cfSrcSet(url, widths = [320, 480, 720]) {
  if (!url || !String(url).includes('res.cloudinary.com')) return undefined;
  return widths.map(w => `${cfImage(url, w)} ${w}w`).join(', ');
}
