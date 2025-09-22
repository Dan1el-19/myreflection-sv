<script lang="ts">
  import logo from '$lib/images/Logo512x512.png';
  import { Menu } from '@lucide/svelte';
  import VisitButton from '$lib/components/VisitButton.svelte';
  import { page } from '$app/state';
  const links = [
    { href: 'o-mnie', label: 'O mnie' },
    { href: 'oferta', label: 'Oferta' },
    { href: 'kwalifikacje', label: 'Kwalifikacje' },
    { href: 'kontakt', label: 'Kontakt' }
  ];

  let mobileOpen = $state(false);
  let tabletOpen = $state(false);
  let mobileMenuEl = $state<HTMLElement | null>(null);
  let tabletMenuEl = $state<HTMLElement | null>(null);
  let mobileBtnEl = $state<HTMLButtonElement | null>(null);
  let tabletBtnEl = $state<HTMLButtonElement | null>(null);

  const toggleMobile = () => mobileOpen = !mobileOpen;
  const toggleTablet = () => tabletOpen = !tabletOpen;
  const closeMobile = () => mobileOpen = false;
  const closeTablet = () => tabletOpen = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (mobileOpen) closeMobile();
      if (tabletOpen) closeTablet();
    }
  };
  
  const onClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (mobileOpen && mobileMenuEl && !mobileMenuEl.contains(target) && mobileBtnEl && !mobileBtnEl.contains(target)) {
      closeMobile();
    }
    if (tabletOpen && tabletMenuEl && !tabletMenuEl.contains(target) && tabletBtnEl && !tabletBtnEl.contains(target)) {
      closeTablet();
    }
  };

  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', onClickOutside);
    }
    
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
      if (typeof document !== 'undefined') document.removeEventListener('mousedown', onClickOutside);
    };
  });
</script>
<nav class="navbar py-0 justify-between bg-base-300">
    <!-- Logo -->
    <div class="flex flex-row items-center lg:navbar-start 2xl:pl-20 md:pl-10 pl-2">
        <a href="/" class="flex items-center justify-center">
            <img alt="Logo" src={logo} class="w-18 h-18 md:w-22 md:h-22" />
            
            <div class="flex flex-col justify-center ml-3 md:ml-5 w-65 lg:w-65 h-16">
                <span class="text-xl md:text-2xl font-bold">My Reflection</span>
                <span class="text-md md:text-lg text-base-content text-end">Joanna Rudzińska-Łodyga</span>
            </div>
        </a>
    </div>

<!-- Menu for mobile -->
  <div class="dropdown dropdown-end ml-3 md:hidden">
    <button bind:this={mobileBtnEl} class="btn btn-square btn-ghost" aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="mobile-menu" onclick={toggleMobile}>
            <Menu color="#25404A"/>
        </button>

        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <ul bind:this={mobileMenuEl} id="mobile-menu" tabindex="0" class="dropdown-content menu z-[1] p-6 rounded-box shadow w-56 gap-2 {mobileOpen ? '' : 'hidden'}">
      {#each links as l}
        <li><a href={l.href}>{l.label}</a></li>
      {/each}
      <VisitButton size="sm" href="umow-wizyte" label="Umów wizytę" />
    </ul>
    </div>

    <!-- Menu for tablet -->
    <div class="hidden md:flex lg:hidden md:pr-10">
      <VisitButton size="md" href="umow-wizyte" label="Umów wizytę" />
   <div class="dropdown dropdown-end">
    <button bind:this={tabletBtnEl} class="btn btn-square btn-ghost ml-3" aria-label="Open navigation menu" aria-expanded={tabletOpen} aria-controls="tablet-menu" onclick={toggleTablet}>
            <Menu color="#25404A"/>
        </button> 

        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <ul bind:this={tabletMenuEl} id="tablet-menu" tabindex="0" class="dropdown-content menu z-[1] p-6 rounded-box shadow w-56 {tabletOpen ? '' : 'hidden'}">
      {#each links as l}
        <li><a href={l.href} class="nav-link">{l.label}</a></li>
      {/each}
    </ul>
    </div>
    </div>

    <!-- Menu for desktop -->
  <ul class="hidden lg:flex lg:flex-row lg:items-center text-md lg:gap-3 xl:gap-10 lg:pr-10 2xl:pr-20">
    {#each links as l}
      <li><a href={l.href} class="nav-link" aria-current={page.url.pathname === l.href ? 'page' : undefined}>{l.label}</a></li>
    {/each}
    <li><VisitButton size="md" href="umow-wizyte" label="Umów wizytę" /></li>
  </ul>
</nav>

<style>
.nav-link {
  position: relative;
  padding: 0.5rem 0.25rem;
  transition: color .3s ease;
}
.nav-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(42, 71, 82, 0.4);
  border-radius: 4px;
}
.nav-link::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: 0;
  height: 2px;
  background: #2A4752;
  border-radius: 2px;
  transition: width .35s ease, left .35s ease, transform .35s ease;
  transform: translateX(-50%);
}
.nav-link:hover,
.nav-link:focus-visible {
  color: #2A4752;
}
.nav-link:hover::after,
.nav-link:focus-visible::after {
  width: 100%;
  left: 0;
  transform: translateX(0);
}
</style>