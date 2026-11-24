// Share helpers. WhatsApp is how students already sell, so it gets its own button.
export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function shopUrl(sellerId) {
  return `${window.location.origin}/seller/${encodeURIComponent(sellerId)}`;
}

export function listingUrl(listingId) {
  return `${window.location.origin}/listing/${encodeURIComponent(listingId)}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
