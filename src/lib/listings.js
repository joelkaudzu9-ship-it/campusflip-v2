// Data access and mapping for marketplace listings. No React in here.
import { supabase } from './supabase';
import { cfImage } from './cloudinary';

export const PAGE_SIZE = 30;

export const categoryMatches = {
  Books: ['books', 'books & study materials'],
  Electronics: ['electronics'],
  Clothes: ['clothes', 'clothing & fashion'],
  Food: ['food', 'food & groceries'],
  More: ['accommodation', 'services', 'furniture & appliances',
    'beauty & personal care', 'sports & fitness', 'other'],
};

export const SORT_ORDER = ['recent', 'price_asc', 'price_desc'];
export const SORT_LABELS = { recent: 'Recent', price_asc: 'Price ↑', price_desc: 'Price ↓' };

export const money = n => `MK ${Number(n || 0).toLocaleString('en-US')}`;

export const relation = value => (Array.isArray(value) ? value[0] : value);

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LISTING_COLUMNS =
  'id, seller_id, title, price, kind, status, is_boosted, created_at';
const LISTING_RELATIONS =
  'meeting_spots(name), listing_photos(image_url, display_order)';

export function mapListing(row, seller) {
  const category = relation(row.categories);
  const spot = relation(row.meeting_spots);
  const photos = [...(row.listing_photos || [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  return {
    id: row.id,
    title: row.title,
    price: row.price,
    kind: row.kind,
    category: category?.name || 'Other',
    location: spot?.name || 'Campus',
    image: cfImage(photos[0]?.image_url, 480) || null,
    badge: row.is_boosted ? 'Boosted' : '',
    isBoosted: row.is_boosted,
    sellerId: row.seller_id,
    sellerName: seller?.display_name || 'CampusFlip Seller',
    businessName: seller?.business_name || '',
    isVerified: seller?.is_verified === true,
    createdAt: row.created_at,
  };
}

async function fetchSellerProfiles(sellerIds) {
  const ids = [...new Set(sellerIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, business_name, is_verified')
    .in('id', ids);
  return Object.fromEntries((data || []).map(p => [p.id, p]));
}

/** One page of the feed. Category and sort run on the server. */
export async function fetchListingsPage(offset, tab, cat, sort) {
  const filterByCategory = tab === 'Marketplace' && cat !== 'All';
  // !inner makes the category filter remove listings, not just blank the join.
  const categorySelect = filterByCategory ? 'categories!inner(name, slug)' : 'categories(name, slug)';

  let request = supabase
    .from('listings')
    .select(`${LISTING_COLUMNS}, ${categorySelect}, ${LISTING_RELATIONS}`)
    .eq('status', 'active');

  if (sort === 'price_asc') {
    request = request.order('price', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  } else if (sort === 'price_desc') {
    request = request.order('price', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  } else {
    request = request.order('is_boosted', { ascending: false }).order('created_at', { ascending: false });
  }

  request = request.range(offset, offset + PAGE_SIZE - 1);

  request = tab === 'Marketplace'
    ? request.eq('kind', 'sale')
    : request.in('kind', ['wanted', 'free', 'lost_found']);

  if (filterByCategory) {
    const names = categoryMatches[cat] || [];
    // ilike without wildcards = case-insensitive exact match, run on the server.
    const conditions = names.map(name => `name.ilike."${name.replace(/"/g, '')}"`).join(',');
    if (conditions) request = request.or(conditions, { referencedTable: 'categories' });
  }

  const { data, error } = await request;
  if (error) throw error;

  const rows = data || [];
  const sellers = await fetchSellerProfiles(rows.map(r => r.seller_id));
  return rows.map(row => mapListing(row, sellers[row.seller_id]));
}

/** A single active listing by id (deep links, notifications). Returns null if gone. */
export async function fetchListingById(id) {
  if (!UUID_RE.test(String(id || ''))) return null;
  const { data, error } = await supabase
    .from('listings')
    .select(`${LISTING_COLUMNS}, categories(name, slug), ${LISTING_RELATIONS}`)
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();
  if (error || !data) return null;
  const sellers = await fetchSellerProfiles([data.seller_id]);
  return mapListing(data, sellers[data.seller_id]);
}

/** Currently running flash deals, mapped to the same shape as listings. */
export async function fetchFlashDeals() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('flash_deals')
    .select(`
      id, listing_id, original_price, deal_price, starts_at, ends_at,
      listings!inner(
        id, seller_id, title, price, kind, status, is_boosted, created_at,
        categories(name, slug), meeting_spots(name), listing_photos(image_url, display_order)
      )
    `)
    .eq('is_active', true)
    .lte('starts_at', now)
    .gt('ends_at', now)
    .eq('listings.status', 'active')
    .eq('listings.kind', 'sale')
    .order('ends_at', { ascending: true })
    .limit(15);

  if (error) throw error;

  const records = data || [];
  const sellers = await fetchSellerProfiles(records.map(r => relation(r.listings)?.seller_id));

  return records.map(record => {
    const listing = relation(record.listings);
    if (!listing) return null;

    const originalPrice = Number(record.original_price);
    const dealPrice = Number(record.deal_price);
    if (!Number.isFinite(originalPrice) || !Number.isFinite(dealPrice) ||
        originalPrice <= 0 || dealPrice <= 0 || dealPrice >= originalPrice) return null;

    return {
      ...mapListing(listing, sellers[listing.seller_id]),
      flashDealId: record.id,
      originalPrice,
      dealPrice,
      discountPercent: Math.round(((originalPrice - dealPrice) / originalPrice) * 100),
      startsAt: record.starts_at,
      endsAt: record.ends_at,
      isFlashDeal: true,
    };
  }).filter(Boolean);
}

/** Active sale listings, for the hero counter. */
export async function fetchActiveCount() {
  const { count, error } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('kind', 'sale');
  return !error && typeof count === 'number' ? count : null;
}

/** Flash-deal listings open with their deal price. */
export const dealToListing = deal => ({
  ...deal,
  price: deal.dealPrice,
  originalPrice: deal.originalPrice,
  isFlashDeal: true,
});
