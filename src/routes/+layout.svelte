<script lang="ts">
	import Header from '$lib/components/NavBar.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<div class="app">
	<Header />
	<main class="bg-c-2">
		{@render children()}
		
	</main>

	<footer>
	</footer>
</div>