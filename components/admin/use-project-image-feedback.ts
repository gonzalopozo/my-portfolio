'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
	clearOgImageWarningParams,
	getOgImageErrorMessage,
	type ProjectImageActionResult,
	type ProjectImageFeedback,
} from '@/lib/og-image-feedback';
import type { ProjectInfo } from '@/lib/types';

type Operation = ProjectImageFeedback['operation'];

interface Feedback {
	projectId: number;
	projectTitle: string;
	operation: Operation;
	title: string;
	message: string;
	summary: string;
	reference?: string;
	uncertain: boolean;
	severity: 'warning' | 'error';
	cleanup: boolean;
}

type Notification =
	| { kind: 'pending'; id: string; projectTitle: string; message: string; delay: number }
	| { kind: 'feedback'; id: string; feedback: Feedback }
	| { kind: 'success'; id: string; projectTitle: string; message: string };

interface Model {
	feedback?: Feedback;
	notification?: Notification;
	toastId?: string;
	attempt?: number;
	pendingProjectId?: number;
	status: string;
	seenReferences: Set<string>;
}

interface Options {
	projects: ProjectInfo[];
	initialFeedback?: ProjectImageFeedback;
	onDelete: (id: number) => Promise<ProjectImageActionResult>;
	refreshOgImage: (id: number) => Promise<ProjectImageActionResult>;
}

function clearWarningUrl() {
	const url = new URL(window.location.href);
	clearOgImageWarningParams(url.searchParams);
	window.history.replaceState(
		window.history.state,
		'',
		`${url.pathname}${url.search}${url.hash}`,
	);
}

function serverFeedback(value: ProjectImageFeedback, projectTitle: string): Feedback {
	const { operation, error } = value;
	const savedProject = operation === 'create' || operation === 'update';
	const uncertain = error.code === 'persistence-uncertain';
	const cleanup = error.code === 'delete-failed';
	let title: string;
	if (uncertain) {
		title = savedProject
			? 'Proyecto guardado; no se pudo confirmar su imagen'
			: operation === 'delete'
				? 'No se pudo confirmar la eliminación del proyecto'
				: 'No se pudo confirmar la actualización de la imagen';
	} else if (cleanup) {
		title =
			operation === 'delete'
				? 'Proyecto eliminado con una advertencia de limpieza'
				: operation === 'refresh'
					? 'Imagen actualizada con una advertencia de limpieza'
					: 'Proyecto guardado con una advertencia de limpieza';
	} else {
		title = savedProject
			? 'Proyecto guardado, pero su imagen no se pudo actualizar'
			: operation === 'delete'
				? 'No se pudo eliminar el proyecto'
				: 'No se pudo actualizar la imagen Open Graph';
	}
	return {
		projectId: value.projectId,
		projectTitle,
		operation,
		title,
		message: getOgImageErrorMessage(error.code),
		reference: error.reference,
		uncertain,
		cleanup,
		severity: uncertain || savedProject || cleanup ? 'warning' : 'error',
		summary: uncertain
			? 'El resultado no está confirmado. Recarga antes de reintentar.'
			: cleanup
				? 'El cambio se guardó. La limpieza se volverá a intentar automáticamente.'
				: savedProject
					? 'Proyecto guardado. Su imagen necesita atención.'
					: 'La operación falló. Consulta los detalles para continuar.',
	};
}

function acceptRedirect(
	model: Model,
	value: ProjectImageFeedback,
	projects: ProjectInfo[],
	scope: string,
): Model {
	const title =
		projects.find((project) => project.id === value.projectId)?.title ??
		`Proyecto #${value.projectId}`;
	const feedback = serverFeedback(value, title);
	const id = `og-${scope}-${value.error.reference}`;
	return {
		feedback,
		toastId: id,
		notification: { kind: 'feedback', id, feedback },
		status: '',
		seenReferences: new Set([...model.seenReferences, value.error.reference]),
	};
}

/** One owned toast follows the active operation; server payloads never contain toast state. */
export function useProjectImageFeedback({
	projects,
	initialFeedback,
	onDelete,
	refreshOgImage,
}: Options) {
	const scope = useId();
	const [model, setModel] = useState<Model>(() => {
		const empty: Model = { status: '', seenReferences: new Set() };
		return initialFeedback ? acceptRedirect(empty, initialFeedback, projects, scope) : empty;
	});
	// Adjust only for a new server reference, preserving local results across RSC rerenders.
	if (initialFeedback && !model.seenReferences.has(initialFeedback.error.reference)) {
		setModel(acceptRedirect(model, initialFeedback, projects, scope));
	}

	const headingRef = useRef<HTMLHeadingElement>(null);
	const feedbackRef = useRef<HTMLDivElement>(null);
	const mounted = useRef(false);
	const epoch = useRef(0);
	const sequence = useRef(0);
	const busy = useRef<number | undefined>(undefined);
	const ownedToast = useRef<string | undefined>(undefined);
	const reference = initialFeedback?.error.reference;

	useEffect(() => {
		mounted.current = true;
		const mountEpoch = epoch.current + 1;
		epoch.current = mountEpoch;
		return () => {
			mounted.current = false;
			epoch.current = mountEpoch + 1;
			busy.current = undefined;
			const id = ownedToast.current;
			// Strict Mode immediately reconnects effects. Dismiss only a real departure,
			// so Sonner cannot queue a dismissal against the reconnected toast ID.
			void Promise.resolve().then(() => {
				if (mounted.current) return;
				if (id) toast.dismiss(id);
				if (ownedToast.current === id) ownedToast.current = undefined;
				// Activity can retain a departed page's state. Expire its feedback too,
				// so returning cannot revive a toast or leave an abandoned action busy.
				setModel((previous) => ({
					status: '',
					seenReferences: previous.seenReferences,
				}));
			});
		};
	}, []);

	useEffect(() => {
		if (reference) clearWarningUrl();
	}, [reference]);

	useEffect(() => {
		if (busy.current !== model.attempt) busy.current = undefined;
	}, [model.attempt]);

	const focusDetails = useCallback(() => feedbackRef.current?.focus(), []);
	const reloadFeedback = useCallback(() => {
		if (ownedToast.current) toast.dismiss(ownedToast.current);
		clearWarningUrl();
		window.location.reload();
	}, []);

	useEffect(() => {
		const notification = model.notification;
		if (ownedToast.current && ownedToast.current !== notification?.id) {
			toast.dismiss(ownedToast.current);
		}
		ownedToast.current = notification?.id;
		if (!notification) return;
		let live = true;
		const hideToast = () => {
			if (!live || !mounted.current) return;
			setModel((previous) =>
				previous.notification === notification
					? { ...previous, notification: undefined, toastId: undefined }
					: previous,
			);
		};
		let timer: ReturnType<typeof setTimeout> | undefined;
		if (notification.kind === 'pending') {
			const showLoading = () => {
				if (!live || !mounted.current) return;
				toast.loading(`${notification.projectTitle}: ${notification.message}`, {
					id: notification.id,
					duration: Infinity,
					closeButton: false,
					dismissible: false,
					description: undefined,
					action: undefined,
					onDismiss: undefined,
					onAutoClose: undefined,
				});
			};
			// Replace an existing error immediately; delay only a brand-new notification.
			if (notification.delay === 0) showLoading();
			else timer = setTimeout(showLoading, notification.delay);
		} else if (notification.kind === 'success') {
			toast.success(`${notification.projectTitle}: ${notification.message}`, {
				id: notification.id,
				duration: 4000,
				closeButton: true,
				dismissible: true,
				description: undefined,
				action: undefined,
				onDismiss: hideToast,
				onAutoClose: hideToast,
			});
		} else {
			const feedback = notification.feedback;
			toast[feedback.severity](`${feedback.projectTitle}: ${feedback.title}`, {
				id: notification.id,
				description: feedback.summary,
				duration: feedback.uncertain || feedback.severity === 'error' ? Infinity : 8000,
				closeButton: true,
				dismissible: true,
				action: feedback.uncertain
					? { label: 'Recargar página', onClick: reloadFeedback }
					: {
							label: 'Ver detalles',
							onClick: (event) => {
								event.preventDefault();
								focusDetails();
							},
						},
				onDismiss: hideToast,
				onAutoClose: hideToast,
			});
		}
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [model.notification, focusDetails, reloadFeedback]);

	function dismissFeedback() {
		setModel((previous) => ({ ...previous, feedback: undefined, notification: undefined }));
		clearWarningUrl();
		headingRef.current?.focus();
	}

	async function runOperation(projectId: number, operation: 'refresh' | 'delete') {
		if (busy.current || !mounted.current) return;
		const attempt = ++sequence.current;
		const operationEpoch = epoch.current;
		busy.current = attempt;
		const projectTitle =
			projects.find((project) => project.id === projectId)?.title ?? `Proyecto #${projectId}`;
		const retrying =
			operation === 'refresh' &&
			model.feedback?.projectId === projectId &&
			model.feedback.operation !== 'delete' &&
			!!model.toastId;
		const id = retrying ? model.toastId! : `og-${scope}-${attempt}`;
		const message =
			operation === 'refresh' ? 'Actualizando imagen Open Graph…' : 'Eliminando proyecto…';
		if (feedbackRef.current?.contains(document.activeElement)) headingRef.current?.focus();
		clearWarningUrl();
		setModel((previous) => ({
			...previous,
			attempt,
			toastId: id,
			pendingProjectId: projectId,
			feedback: undefined,
			status: message,
			notification: { kind: 'pending', id, projectTitle, message, delay: retrying ? 0 : 300 },
		}));
		const isCurrent = () =>
			mounted.current && epoch.current === operationEpoch && busy.current === attempt;
		try {
			const result = await (operation === 'refresh' ? refreshOgImage : onDelete)(projectId);
			if (!isCurrent()) return;
			const error = result.ok ? result.warning : result.error;
			const feedback = error
				? serverFeedback({ projectId, operation, error }, projectTitle)
				: undefined;
			const successMessage =
				operation === 'refresh' ? 'Imagen Open Graph actualizada.' : 'Proyecto eliminado.';
			if (!feedback && operation === 'delete') headingRef.current?.focus();
			setModel((previous) =>
				previous.attempt === attempt
					? {
							...previous,
							feedback,
							pendingProjectId: undefined,
							status: feedback ? '' : successMessage,
							notification: feedback
								? { kind: 'feedback', id, feedback }
								: { kind: 'success', id, projectTitle, message: successMessage },
						}
					: previous,
			);
		} catch {
			if (!isCurrent()) return;
			// A rejected request says nothing about whether the server committed its mutation.
			const feedback: Feedback = {
				projectId,
				projectTitle,
				operation,
				title: 'No se recibió confirmación de la operación',
				message:
					'La operación puede haberse completado, pero no recibimos una confirmación. Recarga la página antes de reintentar.',
				summary: 'El resultado no está confirmado. Recarga antes de reintentar.',
				uncertain: true,
				cleanup: false,
				severity: 'warning',
			};
			setModel((previous) =>
				previous.attempt === attempt
					? {
							...previous,
							feedback,
							pendingProjectId: undefined,
							status: '',
							notification: { kind: 'feedback', id, feedback },
						}
					: previous,
			);
		}
		if (busy.current === attempt) busy.current = undefined;
	}

	const feedbackProject = projects.find((project) => project.id === model.feedback?.projectId);
	return {
		feedback: model.feedback,
		pendingProjectId: model.pendingProjectId,
		status: model.status,
		headingRef,
		feedbackRef,
		canRetry:
			!!model.feedback &&
			model.feedback.operation !== 'delete' &&
			!model.feedback.cleanup &&
			!model.feedback.uncertain &&
			!!feedbackProject?.url,
		dismissFeedback,
		reloadFeedback,
		runOperation,
	};
}
