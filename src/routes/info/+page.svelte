
<script lang="ts">
import ApiVersion from './ApiVersion.svelte';
import BasicForm from './BasicForm.svelte';

type FormData = {
        name: string;
        lastname: string;
    };

let receivedInfo = $state<FormData | null>(null);
function handleFormSubmit(info: FormData) {
    console.log("Dane formularza: ", info);
    receivedInfo = info;
}
</script>
<ApiVersion/>
<main class="p-8 max-w-lg mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">Formularz Kontaktowy</h1>

    <BasicForm onSubmit={handleFormSubmit} />

    {#if receivedInfo}
        <div class="mt-8 p-4 bg-green-100 border border-green-400 rounded-lg text-green-800">
            <h2 class="text-xl font-bold">Otrzymano nowe dane!</h2>
            <p class="mt-2"><strong>Imię:</strong> {receivedInfo.name}</p>
            <p><strong>Nazwisko:</strong> {receivedInfo.lastname}</p>
        </div>
    {/if}
</main>
