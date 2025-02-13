Vue.component('note', {
    props: ['card', 'columnIndex'],
    template: `
    <div class="note" :class="{ locked: card.locked }">
    <!-- Редактируемый заголовок -->
    <p  class="title">{{ card.title }}</p>

    <ul>
      <li v-for="(item, index) in card.items" :key="index" class="anti-dots">
        <input
          type="checkbox"
          :checked="item.completed"
          @change="toggleItem(index)"
          :disabled="card.locked"
        />
        <!-- Редактируемый текст -->
        <a contenteditable @input="updateItemText(index, $event)" class="item-text">{{ item.text }}</a>

        <!-- История изменений -->
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
    <p v-if="card.lastModified">Последнее изменение: {{ card.lastModified }}</p>
  </div>
    `,
    data() {
        return {
            newItemText: '' // Для нового пункта
        };
    },
    methods: {
        toggleItem(index) {
            this.$emit('update-item', { cardIndex: this.card.index, itemIndex: index, columnIndex: this.columnIndex });
        },
        updateTitle(event) {
            // Обновляем заголовок карточки
            this.card.title = event.target.textContent.trim();
            this.updateLastModified();
        },
        updateItemText(index, event) {
            const newText = event.target.textContent.trim();
            if (this.card.items[index].text !== newText) {
              this.card.items[index].changesHistory.push(`Изменен текст: "${newText}"`);
              this.card.items[index].text = newText;
              this.updateLastModified();
            }
        },
        addItem() {
            if (this.newItemText.trim() !== '') {
              this.card.items.push({
                text: this.newItemText.trim(),
                completed: false,
                changesHistory: [`Добавлен новый пункт: "${this.newItemText.trim()}"`] // Записываем историю
              });
              this.newItemText = ''; // Очищаем поле ввода
              this.updateLastModified();
            }
        },
        updateLastModified() {
            // Обновляем время последнего изменения
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
              .map(item => ({
                text: item,
                completed: false,
                changesHistory: [] // Добавляем поле для истории изменений
              }));
        
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
            card.items[itemIndex].completed = !card.items[itemIndex].completed;
        
            // Проверяем завершение карточки или необходимость перемещения
            this.checkCardCompletion(columnIndex, cardIndex);
            this.checkIfCardShouldReturnToFirstColumn(columnIndex, cardIndex);
        },
        checkIfCardShouldReturnToFirstColumn(fromColumn, cardIndex) {
            const card = this.columns[fromColumn].cards[cardIndex];
            const completedCount = card.items.filter(item => item.completed).length;
            const totalItems = card.items.length;

            if (fromColumn !== 0 && completedCount / totalItems <= 0.5) {
                this.moveCard(fromColumn, 0, cardIndex); // Перемещаем карточку в первый столбец
            }
        },
        checkCardCompletion(columnIndex, cardIndex) {
            const card = this.columns[columnIndex].cards[cardIndex];
            const completedCount = card.items.filter(item => item.completed).length;
            const totalItems = card.items.length;
        
            // Если все пункты завершены и карточка не в третьем столбце
            if (completedCount === totalItems && columnIndex !== 2) {
              this.moveCard(columnIndex, 2, cardIndex); // Перемещаем в третий столбец
            } 
            // Если карточка в первом столбце и выполнено более 50% пунктов
            else if (columnIndex === 0 && completedCount / totalItems > 0.5) {
              this.moveCard(columnIndex, 1, cardIndex); // Перемещаем во второй столбец
            }
            // Если карточка во втором столбце и выполнено 100% пунктов
            else if (columnIndex === 1 && completedCount === totalItems) {
              this.moveCard(columnIndex, 2, cardIndex); // Перемещаем в третий столбец
            }
        
            // Обновляем состояние блокировки
            this.checkLockState();
        },
        moveCard(fromColumn, toColumn, cardIndex) {
            const card = this.columns[fromColumn].cards.splice(cardIndex, 1)[0];
        
            // Устанавливаем дату завершения, если карточка перемещается в третий столбец
            if (toColumn === 2) {
              card.completedDate = new Date().toLocaleString(); // Дата завершения
            } else {
              card.completedDate = null; // Сброс даты завершения
            }
        
            // Добавляем карточку в новый столбец
            this.columns[toColumn].cards.push(card);
        
            // Обновляем состояние блокировки
            this.checkLockState();
        },
        checkLockState() {
            const isSecondColumnFull = this.columns[1].cards.length >= this.maxCardsInColumnTwo;
            const hasOver50Percent = this.columns[0].cards.some(card => {
                const completedCount = card.items.filter(item => item.completed).length;
                return completedCount / card.items.length > 0.5; // Более 50%
            });

            this.columns[0].locked = isSecondColumnFull && hasOver50Percent;
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
            <note 
                v-for="(card, cardIndex) in column.cards" 
                :key="cardIndex" 
                :card="card" 
                :column-index="columnIndex" 
                @update-item="toggleItem"
            ></note>
        </div>
    </div>
    `
});
