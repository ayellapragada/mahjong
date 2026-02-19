/**
 * URL routing utilities using hash-based navigation
 * Hash routes work reliably on static hosts (GitHub Pages) without 404 redirects
 *
 * URL format: https://example.com/mahjong/#/play/XXXX
 */

export type Route =
	| { type: 'home' }
	| { type: 'play'; roomCode: string }
	| { type: 'table'; roomCode: string };

/**
 * Convert a Route to its hash path
 */
function routeToHash(route: Route): string {
	switch (route.type) {
		case 'home':
			return '#/';
		case 'play':
			return `#/play/${route.roomCode}`;
		case 'table':
			return `#/table/${route.roomCode}`;
	}
}

/**
 * Parse the current URL hash and return a Route object
 * - #/play/XXXX → { type: 'play', roomCode: 'XXXX' }
 * - #/table/XXXX → { type: 'table', roomCode: 'XXXX' }
 * - Everything else → { type: 'home' }
 */
export function parseRoute(): Route {
	// Get hash without the leading #
	const hash = window.location.hash.slice(1) || '/';

	// Match /play/XXXX
	const playMatch = hash.match(/^\/play\/([A-Za-z0-9]+)$/);
	if (playMatch) {
		return { type: 'play', roomCode: playMatch[1].toUpperCase() };
	}

	// Match /table/XXXX
	const tableMatch = hash.match(/^\/table\/([A-Za-z0-9]+)$/);
	if (tableMatch) {
		return { type: 'table', roomCode: tableMatch[1].toUpperCase() };
	}

	// Default to home
	return { type: 'home' };
}

/**
 * Navigate to a new route by updating the hash
 */
export function navigateTo(route: Route): void {
	const newHash = routeToHash(route);
	if (window.location.hash !== newHash) {
		window.location.hash = newHash;
	}
}

/**
 * Replace the current route in browser history (for redirects)
 * Uses replaceState to avoid adding to history
 */
export function replaceRoute(route: Route): void {
	const newHash = routeToHash(route);
	window.history.replaceState(null, '', newHash);
}

/**
 * Get the full URL for a route (used for QR codes and sharing)
 */
export function getFullUrl(route: Route): string {
	const basePath = import.meta.env.BASE_URL || '/';
	const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
	return `${window.location.origin}${base}/${routeToHash(route)}`;
}
