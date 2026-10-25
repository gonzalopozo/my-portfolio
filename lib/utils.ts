import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(date: Date) {
	return new Date(date).toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}
