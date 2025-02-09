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
})