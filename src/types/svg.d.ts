// Global SVG module declarations
// Placed in src/types so it is picked up by the SvelteKit tsconfig include

declare module '*.svg' {
	const src: string;
	export default src;
}

declare module '*.svg?url' {
	const src: string;
	export default src;
}
