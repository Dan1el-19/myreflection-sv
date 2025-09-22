<script lang="ts">
  export let href: string = '';
  export let size: 'sm' | 'md' | 'lg';
  export let label: string = '';
</script>

<a {href}
   class="btn btn-primary text-base-100 cta-btn"
   class:btn-sm={size==='sm'}
   class:btn-md={size==='md'}
   class:btn-lg={size==='lg'}
   aria-label={label}
>
  {label}
</a>
