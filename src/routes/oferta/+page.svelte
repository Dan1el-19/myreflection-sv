<script lang="ts">
  import type { PageData } from './$types';  
  export let data: PageData;
</script>

<!-- Sekcja główna -->
<section class="py-6 sm:py-8">
  <div class="mx-auto max-w-screen-xl px-4">
    <header class="mb-6 sm:mb-10">
      <h1 class="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Oferta
      </h1>
    </header>

    {#if data?.services && data.services.length > 0}
      <!-- Responsive auto-fit grid -->
      <div
        class="grid gap-6
               [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]
               sm:gap-7 lg:gap-8
               supports-[grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]:grid-cols-1
               "
      >
        {#each data.services as service (service._id)}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <article
            class="card bg-base-100 shadow-sm border border-base-300/50 hover:shadow-md hover:border-primary/40 transition-all duration-200 focus-within:ring focus-within:ring-primary/30"
            tabindex="0"
          >
            <div class="card-body p-5 flex flex-col gap-3">
              <h2 class="card-title text-lg leading-snug">
                Terapia: {service.name}
              </h2>

              <ul class="text-sm flex flex-wrap gap-x-4 gap-y-1 text-base-content/70">
                {#if service.duration}
                  <li class="inline-flex items-center gap-1">
                    <span class="font-medium text-base-content/80">Czas:</span>
                    {service.duration} min
                  </li>
                {/if}
                {#if service.price}
                  <li class="inline-flex items-center gap-1">
                    <span class="font-medium text-base-content/80">Cena:</span>
                    {service.price} PLN
                  </li>
                {/if}
              </ul>

              {#if service.opis}
                <div class="mt-1 prose prose-sm max-w-none prose-headings:mt-4 prose-p:leading-relaxed prose-p:my-2">
                  {#each service.opis as block}
                    {#if block._type === 'block'}
                      <p>
                        {#each block.children as child}
                          {#if child._type === 'span'}
                            {@html child.text}
                          {/if}
                        {/each}
                      </p>
                    {/if}
                  {/each}
                </div>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <p class="text-base-content/70 italic">
        Brak usług do wyświetlenia.
      </p>
    {/if}
  </div>
</section>

<style>
  /* Opcjonalny lekki focus outline dla klawiatury */
  article:focus {
    outline: 2px solid hsl(var(--p) / 0.5);
    outline-offset: 2px;
  }
</style>


