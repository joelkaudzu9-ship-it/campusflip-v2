// The app's URLs. Everything that opens a screen goes through here.
import { matchPath } from 'react-router-dom';

export const PATHS = {
  home: '/',
  search: '/search',
  saved: '/saved',
  shop: '/shop',
  post: '/post',
  account: '/account',
  settings: '/account/settings',
  notifications: '/account/notifications',
  privacy: '/account/privacy',
  admin: '/admin',
  resetPassword: '/reset-password',
  download: '/download',
  help: '/help',
  privacyPolicy: '/privacy-policy',
  terms: '/terms',
  listing: id => `/listing/${encodeURIComponent(id)}`,
  invite: code => `/invite/${encodeURIComponent(code)}`,
};

// Screens that only make sense when signed in.
const PRIVATE = new Set(['saved', 'shop', 'post', 'account', 'settings', 'notifications', 'privacy', 'admin']);

const TABLE = [
  ['home', '/'],
  ['search', '/search'],
  ['saved', '/saved'],
  ['shop', '/shop'],
  ['post', '/post'],
  ['account', '/account'],
  ['settings', '/account/settings'],
  ['notifications', '/account/notifications'],
  ['privacy', '/account/privacy'],
  ['admin', '/admin'],
  ['resetPassword', '/reset-password'],
  ['download', '/download'],
  ['help', '/help'],
  ['privacyPolicy', '/privacy-policy'],
  ['terms', '/terms'],
  ['listing', '/listing/:id'],
  ['invite', '/invite/:code'],
];

/** Which screen a pathname is. `name` is 'notFound' for unknown paths. */
export function parseRoute(pathname) {
  for (const [name, pattern] of TABLE) {
    const m = matchPath({ path: pattern, end: true }, pathname.replace(/(.)\/+$/, '$1'));
    if (m) return { name, params: m.params, isPrivate: PRIVATE.has(name) };
  }
  return { name: 'notFound', params: {}, isPrivate: false };
}

/** Which bottom-nav item a screen belongs to. */
export function navItemFor(name) {
  if (name === 'saved') return 'Saved';
  if (name === 'shop') return 'My Shop';
  if (['account', 'settings', 'notifications', 'privacy', 'admin'].includes(name)) return 'Profile';
  return 'Home';
}
