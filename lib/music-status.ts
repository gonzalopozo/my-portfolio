import type { Track } from '@/lib/types';

export type MusicIntegration = 'lastfm' | 'spotify-search' | 'spotify-artwork';
export type MusicOperationStatus = 'success' | 'empty' | 'skipped' | 'failed';
export type MusicStatus = 'healthy' | 'empty' | 'degraded' | 'unavailable';

export type MusicIssueCode =
	| 'missing-configuration'
	| 'network-error'
	| 'timeout'
	| 'http-error'
	| 'api-error'
	| 'invalid-json'
	| 'invalid-response'
	| 'invalid-url'
	| 'browser-unavailable'
	| 'browser-launch-failed'
	| 'browser-page-failed'
	| 'browser-navigation-failed'
	| 'browser-extraction-failed'
	| 'browser-cleanup-failed'
	| 'refresh-failed';

export interface MusicIssue {
	integration: MusicIntegration | 'refresh';
	operation:
		| 'configuration'
		| 'request'
		| 'parse'
		| 'validation'
		| 'dependency'
		| 'launch'
		| 'page'
		| 'navigation'
		| 'extraction'
		| 'cleanup'
		| 'refresh';
	code: MusicIssueCode;
	httpStatus?: number;
	apiCode?: number;
}

export type MusicResult<T> =
	| { status: 'success'; data: T; issues: MusicIssue[] }
	| { status: 'empty' | 'skipped' | 'failed'; data: null; issues: MusicIssue[] };

export interface MusicIntegrationStatus {
	integration: MusicIntegration;
	status: MusicOperationStatus;
	issues: MusicIssue[];
}

export interface MusicDiagnostics {
	status: MusicStatus;
	checkedAt: string;
	correlationId: string;
	integrations: MusicIntegrationStatus[];
}

export interface MusicSnapshot extends MusicDiagnostics {
	track: Track | null;
}

export interface MusicRefreshState {
	error: string | null;
	message: string | null;
}

/** Fixed copy keeps provider responses and exception details out of the dashboard. */
export const MUSIC_ISSUE_MESSAGES: Record<MusicIssueCode, string> = {
	'missing-configuration':
		'Falta configurar LASTFM_USERNAME o LASTFM_API_KEY en este entorno. Añade las variables y vuelve a desplegar.',
	'network-error': 'No se pudo conectar con el servicio. Vuelve a intentarlo en unos minutos.',
	timeout: 'El servicio tardó demasiado en responder. Vuelve a intentarlo en unos minutos.',
	'http-error':
		'El servicio rechazó la petición. Comprueba su disponibilidad y vuelve a intentarlo.',
	'api-error':
		'Last.fm devolvió un error. Comprueba el usuario, la clave API y los límites del servicio.',
	'invalid-json': 'El servicio devolvió una respuesta ilegible. Vuelve a intentarlo más tarde.',
	'invalid-response':
		'La respuesta del servicio no tiene el formato esperado. Revisa la integración si el problema persiste.',
	'invalid-url': 'Se descartó un enlace no válido del servicio. Revisa la integración.',
	'browser-unavailable':
		'El navegador de Spotify no está disponible. Comprueba que Playwright y Chromium estén instalados en el despliegue.',
	'browser-launch-failed':
		'No se pudo iniciar Chromium. Comprueba su instalación y compatibilidad con el entorno de producción.',
	'browser-page-failed':
		'No se pudo abrir la página de búsqueda de Spotify. Vuelve a intentarlo.',
	'browser-navigation-failed':
		'No se pudo cargar la búsqueda de Spotify. Comprueba su disponibilidad y vuelve a intentarlo.',
	'browser-extraction-failed':
		'No se pudo leer la búsqueda de Spotify. Revisa si la página ha cambiado o está bloqueando el navegador.',
	'browser-cleanup-failed':
		'El navegador de Spotify no se cerró correctamente. Revisa los recursos del entorno de producción.',
	'refresh-failed': 'No se pudo actualizar el estado. Vuelve a intentarlo.',
};
