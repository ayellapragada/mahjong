/**
 * Session management module for localStorage persistence.
 * Allows users to refresh the page and rejoin their game.
 */

export interface SessionData {
	roomCode: string;
	viewMode: 'player' | 'table';
	playerName?: string;
	seat?: number;
	timestamp: number;
}

const SESSION_KEY_PREFIX = 'mahjong-session-';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function getStorageKey(roomCode: string): string {
	return `${SESSION_KEY_PREFIX}${roomCode}`;
}

function isSessionStale(timestamp: number): boolean {
	return Date.now() - timestamp > SESSION_MAX_AGE_MS;
}

/**
 * Save session data to localStorage.
 * Automatically adds the current timestamp.
 */
export function saveSession(data: Omit<SessionData, 'timestamp'>): void {
	const sessionData: SessionData = {
		...data,
		timestamp: Date.now()
	};
	const key = getStorageKey(data.roomCode);
	try {
		localStorage.setItem(key, JSON.stringify(sessionData));
	} catch (error) {
		console.error('Failed to save session:', error);
	}
}

/**
 * Retrieve session data from localStorage.
 * Returns null if session doesn't exist or is stale (older than 24 hours).
 * Stale sessions are automatically cleared.
 */
export function getSession(roomCode: string): SessionData | null {
	const key = getStorageKey(roomCode);
	try {
		const stored = localStorage.getItem(key);
		if (!stored) {
			return null;
		}

		const sessionData: SessionData = JSON.parse(stored);

		if (isSessionStale(sessionData.timestamp)) {
			clearSession(roomCode);
			return null;
		}

		return sessionData;
	} catch (error) {
		console.error('Failed to get session:', error);
		return null;
	}
}

/**
 * Clear session data from localStorage.
 */
export function clearSession(roomCode: string): void {
	const key = getStorageKey(roomCode);
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.error('Failed to clear session:', error);
	}
}

/**
 * Update existing session data in localStorage.
 * Merges the updates with existing data and refreshes the timestamp.
 * If no session exists, this is a no-op.
 */
export function updateSession(
	roomCode: string,
	updates: Partial<Omit<SessionData, 'roomCode' | 'timestamp'>>
): void {
	const existingSession = getSession(roomCode);
	if (!existingSession) {
		return;
	}

	const updatedSession: SessionData = {
		...existingSession,
		...updates,
		timestamp: Date.now()
	};

	const key = getStorageKey(roomCode);
	try {
		localStorage.setItem(key, JSON.stringify(updatedSession));
	} catch (error) {
		console.error('Failed to update session:', error);
	}
}
