Vue.component('note', {
    props: ['card', 'columnIndex'],
    template: `
        <div class="note" :class="{ locked: card.locked }">
            <p class="title">{{ card.title }}</p>
            <ul>
                <li v-for="(item, index) in card.items" :key="index" class="anti-dots">
                    <input 
                        type="checkbox" 
                        :checked="item.completed" 
                        @change="toggleItem(index)" 
                        :disabled="card.locked"
                    />
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
                { title: 'Карточка 1 (max 3)', cards: [], locked: false },
                { title: 'Карточка 2 (max 5)', cards: [], },
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
        toggleItem(columnIndex, cardIndex, itemIndex) {
            const card = this.columns[columnIndex].cards[cardIndex];
            if (card.locked) return; 

            // Инвертируем состояние выполнения пункта
            card.items[itemIndex].completed = !card.items[itemIndex].completed;
        
            // Проверяем завершенность карточки
            this.checkCardCompletion(columnIndex, cardIndex);
        
            // Проверяем, нужно ли вернуть карточку в первый столбец
            this.checkIfCardShouldReturnToFirstColumn(columnIndex, cardIndex);
        },
        checkIfCardShouldReturnToFirstColumn(fromColumn, cardIndex) {
            const card = this.columns[fromColumn].cards[cardIndex];
            const completedCount = card.items.filter(item => item.completed).length;
            const totalItems = card.items.length;
        
            // Если доля выполненных пунктов <= 50% и карточка не находится в первом столбце
            if (fromColumn !== 0 && completedCount / totalItems <= 0.5) {
                this.moveCard(fromColumn, 0, cardIndex); // Перемещаем карточку в первый столбец
            }
        },
        checkCardCompletion(columnIndex, cardIndex) {
            const card = this.columns[columnIndex].cards[cardIndex];
            const completedCount = card.items.filter(item => item.completed).length;
            const totalItems = card.items.length;
            
            if (completedCount === totalItems && columnIndex !== 2) {
                this.moveCard(columnIndex, 2, cardIndex); // Перемещаем в третий столбец
            } 
            // Если карточка находится в первом столбце и больше 50% выполнено
            else if (columnIndex === 0 && completedCount / totalItems > 0.5) {
                this.moveCard(columnIndex, 1, cardIndex); // Перемещаем во второй столбец
            }
            
            if (columnIndex === 0 && completedCount / totalItems > 0.5) {
                this.moveCard(columnIndex, 1, cardIndex); // Перемещаем в второй столбец
            } else if (columnIndex === 1 && completedCount === totalItems) {
                this.moveCard(columnIndex, 2, cardIndex); // Перемещаем в третий столбец
            } else if (columnIndex !== 2 && completedCount === totalItems) {
                this.moveCard(columnIndex, 2, cardIndex);
            }
        
            // Проверяем состояние блокировки после изменения
            this.checkLockState();
        },
        moveCard(fromColumn, toColumn, cardIndex) {
            const card = this.columns[fromColumn].cards.splice(cardIndex, 1)[0];
        
            // Сбрасываем дату завершения, если карточка возвращается в первый столбец
            if (toColumn === 2) {
                card.completedDate = new Date().toLocaleString(); // Дата завершения
            } else {
                card.completedDate = null; // Сброс даты завершения для других столбцов
            }
        
            // Перемещаем карточку
            this.columns[toColumn].cards.push(card);
        
            // Проверяем состояние блокировки после перемещения
            this.checkLockState();
        },
        checkLockState() {
            const isSecondColumnFull = this.columns[1].cards.length >= this.maxCardsInColumnTwo;
            const hasOver50Percent = this.columns[0].cards.some(card => {
                const completedCount = card.items.filter(item => item.completed).length;
                return completedCount / card.items.length > 0.5; // Более 50%
            });
        
            // Блокировка первой колонки
            this.columns[0].locked = isSecondColumnFull && hasOver50Percent;
        
            // Блокировка карточек в первой колонке
            this.columns[0].cards.forEach(card => {
                card.locked = this.columns[0].locked;
            });
        }
    },
    computed: {
        isAddButtonDisabled() {
            const isSecondColumnFull = this.columns[1].cards.length >= this.maxCardsInColumnTwo;
            const hasOver50Percent = this.columns[0].cards.some(card => {
                const completedCount = card.items.filter(item => item.completed).length;
                return completedCount / card.items.length > 0.5;
            });
    
            return isSecondColumnFull && hasOver50Percent;
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
        <div v-for="(card, cardIndex) in column.cards" :key="cardIndex" class="note" :class="{ locked: card.locked }">
            <p class="title">{{ card.title }}</p>
            <ul>
                <li v-for="(item, index) in card.items" :key="index" class="anti-dots">
                    <input
                        type="checkbox"
                        :checked="item.completed"
                        @change="toggleItem(columnIndex, cardIndex, index)"
                        :disabled="card.locked"
                    />
                    {{ item.text }}
                </li>
            </ul>
            <p v-if="card.completedDate">Дата окончания: {{ card.completedDate }}</p>
        </div>
    </div>
</div>
    `
});
