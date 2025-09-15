import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csp: {
      	mode: 'auto',
      	directives: {
        'script-src': ['self'],
        'style-src': ['self', 'fonts.googleapis.com'],
        'font-src': ['self', 'fonts.gstatic.com']
      }
	}
	}
};

export default config;
