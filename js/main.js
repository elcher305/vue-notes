Vue.component('note', {
    props: ['card', 'columnIndex', 'cardIndex'],
    template: `
        <div class="note" :class="{ locked: card.locked }">
            <p class="title">{{ card.title }}</p>
            <ul>
                <li v-for="(item, index) in card.items" :key="index" class="anti-dots">
                    <input
                        type="checkbox"
                        :checked="item.completed"
                        @change="toggleItem(columnIndex, cardIndex, index)"
                        :disabled="card.locked"
                    />
                    <a contenteditable @input="updateItemText(index, $event)" class="item-text">{{ item.text }}</a>
                    <div v-if="item.changesHistory.length > 0" class="changes-history">
                        <strong>История изменений:</strong>
                        <ul>
                            <li v-for="(change, changeIndex) in item.changesHistory" :key="changeIndex">
                                {{ change }}
                            </li>
                        </ul>
                    </div>
                </li>
                <div v-if="columnIndex === 0 && !card.locked">
                    <input
                        type="text"
                        placeholder="Добавить новый пункт"
                        @keydown.enter="addItem"
                        v-model="newItemText"
                        class="forms-additions"
                    />
                </div>
            </ul>
            <p v-if="card.completedDate">Дата окончания: {{ card.completedDate }}</p>
        </div>
    `,
    data() {
        return {
            newItemText: '',
            editing: false,
            editedTitle: '',
            editedItems: []
        };
    },
    methods: {
        editCard() {
            this.editing = true;
            this.editedTitle = this.card.title;
            this.editedItems = this.card.items.map(item => item.text);
        },
        saveEditedCard() {
            if (this.editedTitle.trim() === '') {
                alert('Заголовок не может быть пустым.');
                return;
            }

            const items = this.editedItems
                .filter(item => item.trim() !== '')
                .map(item => ({
                    text: item.trim(),
                    completed: false,
                    changesHistory: []
                }));

            if (items.length < 3 || items.length > 5) {
                alert('Карточка должна содержать от 3 до 5 пунктов.');
                return;
            }

            this.card.title = this.editedTitle;
            this.card.items = items;
            this.editing = false;
        },
        toggleItem(columnIndex, cardIndex, itemIndex) {
            this.$emit('update-item', { columnIndex, cardIndex, itemIndex });
        },
        updateItemText(index, event) {
            const newText = event.target.textContent.trim();
            if (newText === '') {
                alert('Пункт не может быть пустым.');
                return;
            }
            if (this.card.items[index].text !== newText) {
                this.card.items[index].changesHistory.push(`Изменен текст: "${newText}"`);
                this.card.items[index].text = newText;
                this.updateLastModified();
            }
        },
        addItem() {
            if (this.newItemText.trim() === '') {
                alert('Пункт не может быть пустым.');
                return;
            }
            this.card.items.push({
                text: this.newItemText.trim(),
                completed: false,
                changesHistory: [`Добавлен новый пункт: "${this.newItemText.trim()}"`]
            });
            this.newItemText = '';
            this.updateLastModified();
        },
        updateLastModified() {
            this.card.lastModified = new Date().toLocaleString();
        }
    }
});

new Vue({
    el: '#app',
    data() {
        return {
            columns: [
                { title: 'Карточка 1 (max 3)', cards: [], locked: false },
                { title: 'Карточка 2 (max 5)', cards: [] },
                { title: 'без ограничений', cards: [] }
            ],
            newCardTitle: '',
            newCardItems: ['', '', '', '', ''],
            maxCardsInColumnOne: 3,
            maxCardsInColumnTwo: 5,
            editingCard: null
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
            if (this.newCardTitle.trim() !== '' && this.newCardItems[0].trim() !== '' && this.newCardItems[1].trim() !== '' && this.newCardItems[2].trim() !== '') {
                const newCard = {
                    title: this.newCardTitle.trim(),
                    items: this.newCardItems
                        .filter(item => item.trim() !== '')
                        .map(item => ({
                            text: item.trim(),
                            completed: false,
                            changesHistory: []
                        })),
                    locked: false,
                    completedDate: null
                };
                this.columns[columnIndex].cards.push(newCard);
                this.newCardTitle = '';
                this.newCardItems = ['', '', '', '', ''];
            }
        },
        toggleItem({ columnIndex, cardIndex, itemIndex }) {
            const card = this.columns[columnIndex].cards[cardIndex];
            if (card.locked) return;

            card.items[itemIndex].completed = !card.items[itemIndex].completed;
            this.checkCardCompletion(columnIndex, cardIndex);
        },
        checkCardCompletion(columnIndex, cardIndex) {
            const card = this.columns[columnIndex].cards[cardIndex];
            const completedCount = card.items.filter(item => item.completed).length;
            const totalItems = card.items.length;

            if (completedCount === totalItems && columnIndex !== 2) {
                this.moveCard(columnIndex, 2, cardIndex);
            } else if (columnIndex === 0 && completedCount / totalItems > 0.5) {
                this.moveCard(columnIndex, 1, cardIndex);
            } else if (columnIndex === 1 && completedCount / totalItems < 0.5) {
                this.moveCard(columnIndex, 0, cardIndex);
            } else if (columnIndex === 2 && completedCount / totalItems < 1) {
                this.moveCard(columnIndex, 1, cardIndex);
            }

            this.checkLockState();
        },
        moveCard(fromColumn, toColumn, cardIndex) {
            const card = this.columns[fromColumn].cards.splice(cardIndex, 1)[0];

            if (toColumn === 0 && this.columns[0].cards.length >= this.maxCardsInColumnOne) {
                alert('Первый столбец переполнен. Невозможно переместить карточку.');
                this.columns[fromColumn].cards.splice(cardIndex, 0, card);
                return;
            }
            if (toColumn === 1 && this.columns[1].cards.length >= this.maxCardsInColumnTwo) {
                alert('Второй столбец переполнен. Невозможно переместить карточку.');
                this.columns[fromColumn].cards.splice(cardIndex, 0, card);
                return;
            }

            if (toColumn === 2) {
                card.completedDate = new Date().toLocaleString();
            } else {
                card.completedDate = null;
            }

            this.columns[toColumn].cards.push(card);
            this.checkLockState();
        },
        checkLockState() {
            const isSecondColumnFull = this.columns[1].cards.length >= this.maxCardsInColumnTwo;
            const hasOver50Percent = this.columns[0].cards.some(card => {
                const completedCount = card.items.filter(item => item.completed).length;
                return completedCount / card.items.length > 0.5;
            });

            this.columns[0].locked = isSecondColumnFull && hasOver50Percent;
            this.columns[0].cards.forEach(card => {
                card.locked = this.columns[0].locked;
            });
        }
    },
    computed: {
        isAddButtonDisabled() {
            return !this.newCardTitle || !this.newCardItems[0] || !this.newCardItems[1] || !this.newCardItems[2];
        }
    },
    template: `
        <div id="app">
            <div v-for="(column, columnIndex) in columns" :key="columnIndex" class="column">
                <h2>{{ column.title }}</h2>
                <form v-if="columnIndex === 0 && canAddCard(columnIndex)" @submit.prevent="addCard(columnIndex)">
                    <input class="form" type="text" v-model="newCardTitle" placeholder="Заголовок" required>
                    <input class="form" type="text" v-model="newCardItems[0]" placeholder="Пункт 1" required>
                    <input class="form" type="text" v-model="newCardItems[1]" placeholder="Пункт 2" required>
                    <input class="form" type="text" v-model="newCardItems[2]" placeholder="Пункт 3" required>
                    <input class="form" type="text" v-model="newCardItems[3]" placeholder="Пункт 4 (опционально)">
                    <input class="form" type="text" v-model="newCardItems[4]" placeholder="Пункт 5 (опционально)">
                    <button type="submit" class="but" :disabled="isAddButtonDisabled">Добавить</button>
                </form>
                <note
                    v-for="(card, cardIndex) in column.cards"
                    :key="cardIndex"
                    :card="card"
                    :column-index="columnIndex"
                    :card-index="cardIndex"
                    @update-item="toggleItem"
                ></note>
            </div>
        </div>
    `
});
