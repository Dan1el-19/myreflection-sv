<script lang="ts">
    type FormData = {
        name: string;
        lastname: string;
    };
    let { onSubmit }: { onSubmit: (dane: FormData) => void } = $props();

    let name = $state('');
    let lastname = $state('');

    function handleForm(e: Event) {
        e.preventDefault();
        onSubmit({ name, lastname });
    }
</script>

<form class="flex flex-col gap-4 p-4 rounded-xl border-2 border-gray-300 mx-auto" onsubmit={handleForm}>
    <label for="name">Imie</label>
    <input class="border border-gray-300 p-2 rounded" type="text" id="name" name="name" bind:value={name}/>
    <label for="lastname">Naziwsko</label>
    <input class="border border-gray-300 p-2 rounded" type="text" id="lastname" name="lastname" bind:value={lastname}/>
    <input type="submit" value="Submit" class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 cursor-pointer"/>
</form>