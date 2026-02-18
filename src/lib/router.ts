/**
 * URL routing utilities for path-based navigation
 */

export type Route =
	| { type: 'home' }
	| { type: 'play'; roomCode: string }
	| { type: 'table'; roomCode: string };

/**
 * Convert a Route to its URL path
 */
function routeToPath(route: Route): string {
	switch (route.type) {
		case 'home':
			return '/';
		case 'play':
			return `/play/${route.roomCode}`;
		case 'table':
			return `/table/${route.roomCode}`;
	}
}

/**
 * Parse the current URL path and return a Route object
 * - /play/XXXX → { type: 'play', roomCode: 'XXXX' }
 * - /table/XXXX → { type: 'table', roomCode: 'XXXX' }
 * - Everything else → { type: 'home' }
 */
export function parseRoute(): Route {
	const path = window.location.pathname;

	// Match /play/XXXX
	const playMatch = path.match(/^\/play\/([A-Za-z0-9]+)$/);
	if (playMatch) {
		return { type: 'play', roomCode: playMatch[1].toUpperCase() };
	}

	// Match /table/XXXX
	const tableMatch = path.match(/^\/table\/([A-Za-z0-9]+)$/);
	if (tableMatch) {
		return { type: 'table', roomCode: tableMatch[1].toUpperCase() };
	}

	// Default to home
	return { type: 'home' };
}

/**
 * Navigate to a new route by pushing state to browser history
 * Only pushes if the path is different from the current path
 */
export function navigateTo(route: Route): void {
	const newPath = routeToPath(route);
	const currentPath = window.location.pathname;

	if (newPath !== currentPath) {
		window.history.pushState(null, '', newPath);
	}
}

/**
 * Replace the current route in browser history (for redirects)
 * Uses replaceState instead of pushState
 */
export function replaceRoute(route: Route): void {
	const newPath = routeToPath(route);
	window.history.replaceState(null, '', newPath);
}
