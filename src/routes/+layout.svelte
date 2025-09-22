<script lang="ts">
	import Header from '$lib/components/NavBar.svelte';
	import '../app.css';
	let { children } = $props();
</script>

<div class="app flex flex-col min-h-screen bg-base-100">
  <Header />
  <main class="flex-1">
    {@render children()}
  </main>
  <footer></footer>
</div>