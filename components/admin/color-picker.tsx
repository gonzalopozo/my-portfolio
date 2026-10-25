'use client';

import { useState } from 'react';
import { ColorArea, ColorThumb } from 'react-aria-components/ColorArea';
import { ColorPicker, parseColor } from 'react-aria-components/ColorPicker';
import { ColorSlider, SliderTrack } from 'react-aria-components/ColorSlider';
import { ColorSwatch } from 'react-aria-components/ColorSwatch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ColorPickerFieldProps {
	name: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
}

export function ColorPickerField({ name, label, value, onChange }: ColorPickerFieldProps) {
	const color = parseColor(value);
	const [hexDraft, setHexDraft] = useState<string | null>(null);
	const hex = value;

	return (
		<ColorPicker
			value={color}
			onChange={(nextColor) => {
				const nextHex = nextColor.toString('hex').toLowerCase();
				setHexDraft(null);
				onChange(nextHex);
			}}
		>
			<input type="hidden" name={name} value={hex} />
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id={name}
						type="button"
						variant="outline"
						aria-label={`${label}, actual ${hex}`}
						className="h-11 w-full justify-start gap-3 font-normal"
					>
						<ColorSwatch
							color={color}
							aria-hidden="true"
							className="size-6 shrink-0 rounded-md border border-foreground/20"
						/>
						<span className="font-mono text-sm uppercase">{hex}</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="flex w-72 flex-col gap-4 p-4">
					<ColorArea
						colorSpace="hsb"
						xChannel="saturation"
						yChannel="brightness"
						aria-label="Saturación y brillo"
						className="relative h-44 w-full touch-none rounded-md border border-border"
					>
						<ColorThumb className="size-5 rounded-full border-2 border-white shadow-sm ring-1 ring-foreground/30 data-focus-visible:ring-2 data-focus-visible:ring-ring" />
					</ColorArea>
					<ColorSlider
						channel="hue"
						colorSpace="hsb"
						aria-label="Matiz"
						className="flex flex-col gap-2"
					>
						<span className="text-xs font-medium text-muted-foreground">Matiz</span>
						<SliderTrack className="relative h-6 w-full touch-none rounded-full border border-border">
							<ColorThumb className="size-5 rounded-full border-2 border-white shadow-sm ring-1 ring-foreground/30 data-focus-visible:ring-2 data-focus-visible:ring-ring" />
						</SliderTrack>
					</ColorSlider>
					<div className="flex items-end gap-3">
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<span className="text-xs font-medium text-muted-foreground">
								Vista previa
							</span>
							<div
								role="img"
								aria-label={`Vista previa del color ${hex}`}
								className="h-9 w-full rounded-md border border-border"
								style={{ backgroundColor: hex }}
							/>
						</div>
						<div className="flex w-28 shrink-0 flex-col gap-2">
							<Label
								htmlFor={`${name}-hex`}
								className="text-xs text-muted-foreground"
							>
								Hex
							</Label>
							<Input
								id={`${name}-hex`}
								type="text"
								value={hexDraft ?? hex}
								maxLength={7}
								spellCheck={false}
								className="font-mono"
								onChange={(event) => {
									const nextHex = event.target.value.startsWith('#')
										? event.target.value
										: `#${event.target.value}`;
									if (!/^#[0-9a-f]{0,6}$/i.test(nextHex)) return;

									setHexDraft(
										nextHex.length === 7 ? null : nextHex.toLowerCase(),
									);
									if (nextHex.length === 7) onChange(nextHex.toLowerCase());
								}}
								onPaste={(event) => {
									const pastedHex = event.clipboardData.getData('text').trim();
									if (!/^#?[0-9a-f]{6}$/i.test(pastedHex)) return;

									event.preventDefault();
									const nextHex = `#${pastedHex.replace(/^#/, '')}`.toLowerCase();
									setHexDraft(null);
									onChange(nextHex);
								}}
								onBlur={() => setHexDraft(null)}
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</ColorPicker>
	);
}
