/** Safe, serializable OG image outcomes shared by server operations and the dashboard. */
const errorMessages = {
	'invalid-project': 'El proyecto no es válido. Recarga la página e inténtalo de nuevo.',
	'invalid-url': 'La dirección de origen no es válida. Revisa el enlace del proyecto.',
	'blocked-url':
		'El origen debe usar HTTPS y resolver únicamente a direcciones públicas, sin credenciales ni redirecciones.',
	'dns-failed':
		'No se pudo resolver el servidor de origen. Comprueba el enlace e inténtalo de nuevo.',
	timeout: 'El servidor de origen tardó demasiado en responder. Inténtalo de nuevo.',
	'request-failed':
		'No se pudo descargar el contenido del origen. Comprueba que sea accesible directamente, sin redirecciones.',
	'http-failed':
		'El servidor de origen devolvió una respuesta fallida. Comprueba que la página y su imagen estén disponibles.',
	'invalid-content-type':
		'El origen no devolvió HTML o una imagen compatible. Revisa la página y su etiqueta Open Graph.',
	'too-large':
		'La página o la imagen supera el límite de 5 MiB. Reduce su tamaño e inténtalo de nuevo.',
	'missing-image':
		'La página no tiene una etiqueta og:image con una dirección válida. Añádela antes de reintentar.',
	'invalid-image':
		'El archivo no es una imagen PNG, JPEG, WebP, GIF o AVIF válida. Revisa la imagen de origen.',
	'upload-failed':
		'No se pudo subir la imagen al almacenamiento. Inténtalo de nuevo o revisa su configuración en producción.',
	'delete-failed':
		'No se pudo eliminar una imagen del almacenamiento. Revisa los registros con la referencia indicada.',
	'persist-failed':
		'No se pudo guardar la referencia de la imagen. Se ha conservado la imagen anterior, si existía.',
	'project-delete-failed':
		'No se pudo eliminar el proyecto. Recarga la página e inténtalo de nuevo.',
	'not-found': 'El proyecto ya no existe. Recarga la página.',
	'no-source':
		'El proyecto no tiene un enlace de origen. Añade un enlace HTTPS para obtener su imagen.',
	unexpected:
		'No se pudo completar la operación de imagen. Inténtalo de nuevo y consulta los registros si el problema continúa.',
};

export type OgImageErrorCode = keyof typeof errorMessages;

const stages = [
	'page-url',
	'page-dns',
	'page-fetch',
	'page-body',
	'metadata',
	'image-url',
	'image-dns',
	'image-fetch',
	'image-body',
	'upload',
	'persistence',
	'cleanup',
] as const;

export type OgImageStage = (typeof stages)[number];

export interface OgImageError {
	code: OgImageErrorCode;
	stage: OgImageStage;
	reference: string;
}

export type OgImageResult = { ok: true } | { ok: false; error: OgImageError };

export type OgImageUploadResult = { ok: true; url: string } | { ok: false; error: OgImageError };

export type ProjectImageActionResult =
	| { ok: true; warning?: OgImageError }
	| { ok: false; error: OgImageError };

export interface ProjectImageFeedback {
	projectId: number;
	operation: 'create' | 'update' | 'refresh' | 'delete';
	error: OgImageError;
}

export function getOgImageErrorMessage(code: OgImageErrorCode): string {
	return errorMessages[code];
}

const warningParams = ['ogOperation', 'ogProject', 'ogCode', 'ogStage', 'ogReference'] as const;

export function clearOgImageWarningParams(params: URLSearchParams): void {
	for (const key of warningParams) params.delete(key);
}

export function getOgImageWarningRedirect(feedback?: ProjectImageFeedback): string {
	if (!feedback) return '/dashboard/projects';
	const params = new URLSearchParams({
		ogOperation: feedback.operation,
		ogProject: String(feedback.projectId),
		ogCode: feedback.error.code,
		ogStage: feedback.error.stage,
		ogReference: feedback.error.reference,
	});
	return `/dashboard/projects?${params}`;
}

/** Query parameters are untrusted: render only our fixed catalogue, never supplied text. */
export function parseOgImageWarning(
	params: Record<string, string | string[] | undefined>,
): ProjectImageFeedback | undefined {
	const operation = params.ogOperation;
	const project = params.ogProject;
	const code = params.ogCode;
	const stage = params.ogStage;
	const reference = params.ogReference;
	if (
		(operation !== 'create' && operation !== 'update') ||
		typeof project !== 'string' ||
		!/^[1-9]\d{0,15}$/.test(project) ||
		!Number.isSafeInteger(Number(project)) ||
		typeof code !== 'string' ||
		!Object.hasOwn(errorMessages, code) ||
		typeof stage !== 'string' ||
		!stages.some((value) => value === stage) ||
		typeof reference !== 'string' ||
		!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(reference)
	)
		return undefined;
	return {
		projectId: Number(project),
		operation,
		error: { code: code as OgImageErrorCode, stage: stage as OgImageStage, reference },
	};
}
