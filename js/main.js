const app = Vue.createApp({
    data() {
        return {
            intro: 'Welcome to my Vue template',
            list: [1, 2, 3, 4, 5],
            nr: 0,
            shownumbers: true,
        }
    },
    methods: {
        myMethod() {

        },
        add() {
            this.list.push(this.nr)
            this.list.sort((a, b) => a - b)
        },
        hidelist() {
            this.shownumbers = !this.shownumbers
        },
    },
    computed: {
        myComputed() {
            return ''
        },
    }
})