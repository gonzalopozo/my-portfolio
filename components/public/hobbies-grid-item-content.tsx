import 'server-only';

import { DynamicIcon } from '@/components/public/dynamic-icon';
import { HobbiesGridItemClient } from '@/components/public/hobbies-grid-item-client';

const hobbies = [
	{ id: 'nba', name: 'NBA', icon: 'BiSolidBasketball | bi', image: 'basketball' },
	{ id: 'cars', name: 'Cars', icon: 'BiSolidCar | bi', image: 'cars' },
	{ id: 'watches', name: 'Watches', icon: 'BiSolidWatch | bi', image: 'watches' },
	{ id: 'startups', name: 'Startups', icon: 'BiSolidRocket | bi', image: 'startups' },
	{ id: 'training', name: 'Training', icon: 'BiDumbbell | bi', image: 'gym' },
	{ id: 'reading', name: 'Reading', icon: 'BiSolidBookOpen | bi', image: 'books' },
];

export function HobbiesGridItemContent() {
	return (
		<HobbiesGridItemClient
			hobbies={hobbies.map(({ image, icon, ...hobby }) => ({
				...hobby,
				icon: <DynamicIcon iconFullName={icon} className="size-6" />,
				lightThemeImage: `/hobbies/${image}_dark.png`,
				darkThemeImage: `/hobbies/${image}_light.png`,
			}))}
		/>
	);
}
