import 'server-only';

import { DynamicIcon } from '@/components/public/dynamic-icon';
import { MapGridItemContent } from '@/components/public/map-grid-item-content';

export function MapGridItem() {
	return (
		<MapGridItemContent
			fingerIcon={
				<DynamicIcon
					iconFullName="TbHandFinger | tb"
					className="absolute size-5 transition-[transform,opacity] duration-200 group-hover/map:scale-75 group-hover/map:opacity-0"
				/>
			}
			clickIcon={
				<DynamicIcon
					iconFullName="TbHandClick | tb"
					className="absolute size-5 scale-75 opacity-0 transition-[transform,opacity] duration-200 group-hover/map:scale-100 group-hover/map:opacity-100"
				/>
			}
		/>
	);
}
