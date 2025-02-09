Vue.component('note', {
    props: ['card', 'columnIndex'],
    template: `
        <div class="note" :class="{locked: card.locked}">
            <p class="title">{{ card.title }}</p>
            <ul>
                <li v-for="(item, index) in card.cards" :key="index" class="anti-dots">
                    <input type="checkbox" :checked="item.completed" @change="toggleItem(index)" :disabled="card.locked"/>
                    {{ item.text }}
                </li>    
            </ul>
            <p v-if="card.completedDate">Дата окончания: {{ card.completedDate }}</p>
        </div>
    `,
    methods: {
        toggleItem(index) {
            this.$emit('update-item', { cardIndex: this.card.index, itemIndex: index, columnIndex: this.columnIndex });
        }
    }
});

new Vue({
    el: '#app',
    data() {
        return {
            columns: [
                { title: '3', cards: [], locked: false },
                { title: '5', cards: [] },
                { title: 'без ограничений', cards: [] }
            ],
            newCardTitle: '',
            newCardItems: ['', '', '', '', ''],
            maxCardsInColumnOne: 3,
            maxCardsInColumnTwo: 5
        };
    },
    created() {
        const savedData = JSON.parse(localStorage.getItem('noteAppData'));
        if (savedData) {
            this.columns = savedData.columns;
        }
    },
    watch: {
        columns: {
            deep: true,
            handler() {
                localStorage.setItem('noteAppData', JSON.stringify({ columns: this.columns }));
            }
        }
    },