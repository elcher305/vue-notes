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
    methods: {
        canAddCard(columnIndex) {
            if (columnIndex === 0 && this.columns[0].cards.length >= this.maxCardsInColumnOne) return false;
            if (columnIndex === 1 && this.columns[1].cards.length >= this.maxCardsInColumnTwo) return false;
            return true;
        },
        addCard(columnIndex) {
            const items = this.newCardItems
                .filter(item => item.trim() !== '')
                .map(item => ({ text: item, completed: false }));

            if (items.length < 3 || items.length > 5) {
                alert('Карточка должна содержать от 3 до 5 пунктов.');
                return;
            }

            const newCard = {
                title: this.newCardTitle,
                items: items,
                locked: false,
                completedDate: null,
                reasonForMove: ''
            };

            this.columns[columnIndex].cards.push(newCard);
            this.newCardTitle = '';
            this.newCardItems = ['', '', '', '', ''];
            this.checkLockState();
        },
        checkCardCompletion(columnIndex, cardIndex) {
            const card = this.columns[columnIndex].cards[cardIndex];
            const completedCount = card.items.filter(item => item.completed).length;
            const totalItems = card.items.length;

            if (columnIndex === 0 && completedCount / totalItems > 0.5) {
                this.moveCard(columnIndex, 1, cardIndex);
            } else if (columnIndex === 1 && completedCount / totalItems < 0.5) {
                this.askForReasonAndMove(columnIndex, 0, cardIndex); // Запрашиваем причину
            } else if (columnIndex !== 2 && completedCount === totalItems) {
                this.moveCard(columnIndex, 2, cardIndex);
            }
        },
        moveCard(fromColumn, toColumn, cardIndex) {
            const card = this.columns[fromColumn].cards.splice(cardIndex, 1)[0];
            card.completedDate = toColumn === 2 ? new Date().toLocaleString() : null;
            this.columns[toColumn].cards.push(card);
            this.checkLockState();
        },
        askForReasonAndMove(fromColumn, toColumn, cardIndex) {
            const reason = prompt('Укажите причину перемещения карточки обратно в первую колонку:');
            if (reason === null || reason.trim() === '') {
                alert('Причина перемещения не указана. Карточка не будет перемещена.');
                return;
            }

            const card = this.columns[fromColumn].cards[cardIndex];
            card.reasonForMove = reason; // Сохраняем причину
            this.moveCard(fromColumn, toColumn, cardIndex);
        },
        checkLockState() {
            const isSecondColumnFull = this.columns[1].cards.length >= this.maxCardsInColumnTwo;
            const hasOver50Percent = this.columns[0].cards.some(card => {
                const completedCount = card.items.filter(item => item.completed).length;
                return completedCount / card.items.length >= 0.5;
            });

            this.columns[0].locked = isSecondColumnFull && hasOver50Percent;

            this.columns[0].cards.forEach(card => {
                card.locked = this.columns[0].locked;
            });
        }
    },