import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$types: 'src/types'
		},
		csp: {
      	mode: 'auto',
      	directives: {
        'script-src': ['self'],
        'style-src': ['self', 'fonts.googleapis.com', 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='],
        'font-src': ['self', 'fonts.gstatic.com']
      }
	}
	}
};

export default config;
