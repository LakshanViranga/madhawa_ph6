import { ref } from 'vue'

// Remembers which class a visitor picked on a class card, so the "Join a class" form can start with it selected.
const chosen = ref(null)

export function useClassChoice() {
    return {
        chosen,
        // A new object each time, so choosing the same class twice still counts as a new choice
        choose: (name) => { chosen.value = { name } },
    }
}
