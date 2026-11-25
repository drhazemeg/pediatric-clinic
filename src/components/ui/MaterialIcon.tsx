// apps/web/src/components/ui/MaterialIcon.tsx
import { type CSSProperties, useEffect, useSyncExternalStore } from "react";

type FontState = "loading" | "ready" | "missing";

let fontState: FontState = "loading";
const listeners = new Set<() => void>();
let probeStarted = false;

function subscribe(cb: () => void) {
	listeners.add(cb);
	return () => {
		listeners.delete(cb);
	};
}

function getSnapshot(): FontState {
	return fontState;
}

function getServerSnapshot(): FontState {
	return "loading";
}

function setFontState(next: FontState) {
	if (fontState === next) return;
	fontState = next;
	for (const cb of listeners) cb();
}

function startFontProbe() {
	if (probeStarted) return;
	probeStarted = true;

	if (typeof document === "undefined" || !document.fonts) {
		setFontState("missing");
		return;
	}

	const family = '1em "Material Symbols Outlined"';
	Promise.resolve(document.fonts.load(family))
		.catch(() => undefined)
		.then(() => {
			setFontState(document.fonts.check(family) ? "ready" : "missing");
		});
}

type MaterialIconProps = {
	name: string;
	className?: string;
	label?: string;
	title?: string;
	fill?: boolean;
	weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
	/** Inline style passthrough. Note: overrides the loading `opacity` gate. */
	style?: CSSProperties;
};

export function MaterialIcon({
	name,
	className = "",
	label,
	title,
	fill,
	weight,
	style
}: MaterialIconProps) {
	const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	useEffect(() => {
		startFontProbe();
	}, []);

	const isDecorative = !label;

	const fontVariationSettings = [
		fill !== undefined ? `"FILL" ${fill ? 1 : 0}` : null,
		weight !== undefined ? `"wght" ${weight}` : null
	]
		.filter(Boolean)
		.join(", ");

	const glyphClass =
		state === "missing"
			? `select-none text-[0.6em] font-mono leading-none ${className}`
			: `material-symbols-outlined select-none ${className}`;

	return (
		<span
			aria-hidden={isDecorative || undefined}
			aria-label={label}
			className={glyphClass}
			data-icon={name}
			role='img'
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: "1em",
				height: "1em",
				lineHeight: 1,
				overflow: "visible",
				...(state === "loading" ? { opacity: 0 } : undefined),
				...(fontVariationSettings ? { fontVariationSettings } : undefined),
				...style
			}}
			title={title}
		>
			{state === "ready" ? name : ""}
		</span>
	);
}
