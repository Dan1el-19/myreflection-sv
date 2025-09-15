/// <reference types="svelte" />
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// extend App namespace here if needed
	}
}

export {};

// Minimal declaration to satisfy type import from build pipeline if referenced indirectly
declare module '@sveltejs/kit/vite' {
	import type { Plugin } from 'vite';
	export function sveltekit(): Plugin;
}
