'use client';

import { safeWebUrl } from '@/lib/security/urls';

import { DragDropProvider } from '@dnd-kit/react';
import { Pencil, ExternalLink, Trash } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { SortableTableBody, SortableTableRow } from '@/components/admin/sortable-table';
import { useSortableTableOrder } from '@/components/admin/use-sortable-table-order';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { updateSocialLinkOrder } from '@/lib/actions/social-links';
import { type SocialLinkInfo } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface SocialLinksTableProps {
	socialLinks: SocialLinkInfo[];
	onDelete: (id: number) => Promise<void>;
}

export function SocialLinksTable({
	socialLinks: serverSocialLinks,
	onDelete,
}: SocialLinksTableProps) {
	const {
		items: socialLinks,
		handleDragEnd,
		isSaving,
	} = useSortableTableOrder({
		items: serverSocialLinks,
		updateOrder: updateSocialLinkOrder,
		onSuccess: (name, newOrder) => {
			toast.success(`Enlace "${name}" actualizado a la posición ${newOrder}`);
		},
	});

	return (
		<DragDropProvider onDragEnd={handleDragEnd}>
			<Table aria-busy={isSaving}>
				<TableHeader>
					<TableRow>
						<TableHead className="w-16">
							<span className="sr-only">Reordenar</span>
						</TableHead>
						<TableHead className="w-16">Orden</TableHead>
						<TableHead>Nombre</TableHead>
						<TableHead>URL</TableHead>
						<TableHead>Icono</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead>Actualizado</TableHead>
						<TableHead className="text-right">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<SortableTableBody id="social-links">
					{socialLinks.map((socialLink, index) => (
						<SortableTableRow
							key={socialLink.id}
							id={socialLink.id}
							index={index}
							label={`Reordenar enlace "${socialLink.name}"`}
							disabled={isSaving}
						>
							<TableCell>
								<Badge variant="outline" className="font-mono">
									{socialLink.order}
								</Badge>
							</TableCell>
							<TableCell className="font-medium">{socialLink.name}</TableCell>
							<TableCell>
								{socialLink.url ? (
									<a
										href={safeWebUrl(socialLink.url)}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex max-w-50 items-center gap-1 truncate text-sm text-primary hover:underline"
									>
										{socialLink.url}
										<ExternalLink
											className="size-3 shrink-0"
											aria-hidden="true"
										/>
									</a>
								) : (
									<span className="text-muted-foreground">Sin URL</span>
								)}
							</TableCell>
							<TableCell className="font-mono text-sm">
								{socialLink.icon || 'Sin icono'}
							</TableCell>
							<TableCell className="text-sm text-muted-foreground">
								{formatDate(socialLink.createdAt)}
							</TableCell>
							<TableCell className="text-sm text-muted-foreground">
								{formatDate(socialLink.updatedAt)}
							</TableCell>
							<TableCell className="text-right">
								<div className="flex items-center justify-end gap-1">
									<Button variant="ghost" size="sm" asChild>
										<Link
											href={`/dashboard/social-links/${socialLink.id}/edit`}
											className="gap-1.5"
										>
											<Pencil data-icon="inline-start" aria-hidden="true" />
											Editar
										</Link>
									</Button>
									<Button
										onClick={() => onDelete(socialLink.id)}
										variant="destructive"
										size="sm"
										className="gap-1.5"
									>
										<Trash data-icon="inline-start" aria-hidden="true" />
										Eliminar
									</Button>
								</div>
							</TableCell>
						</SortableTableRow>
					))}
				</SortableTableBody>
			</Table>
		</DragDropProvider>
	);
}
