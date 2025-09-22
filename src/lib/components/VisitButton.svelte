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

<style>
.cta-btn {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  transition: transform .35s cubic-bezier(.4,0,.2,1), box-shadow .35s ease;
  will-change: transform;
}
.cta-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -60%;
  width: 50%;
  height: 100%;
  background: linear-gradient(110deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.45) 45%, rgba(255,255,255,0) 90%);
  transform: skewX(-20deg);
  opacity: 0;
  transition: left .6s ease, opacity .4s ease;
}
.cta-btn:hover::before,
.cta-btn:focus-visible::before {
  left: 130%;
  opacity: 1;
}
.cta-btn:hover,
.cta-btn:focus-visible {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 8px 18px -4px rgba(0,0,0,.25);
}
.cta-btn:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 4px 10px -2px rgba(0,0,0,.25);
}
@media (prefers-reduced-motion: reduce) {
  .cta-btn { transition: none !important; }
  .cta-btn:hover, .cta-btn:focus-visible, .cta-btn:active { transform:none; box-shadow:none; }
  .cta-btn::before { display:none; }
}
</style>
