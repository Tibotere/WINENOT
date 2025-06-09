document.addEventListener('DOMContentLoaded', function() {
    if (sessionStorage.getItem('chatbotShown')) {
        initializeChatbot();
        return;
    }

    setTimeout(function() {
        sessionStorage.setItem('chatbotShown', 'true');
        initializeChatbot();
    }, 10000);
});

function initializeChatbot() {
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chatbot-container';
    chatContainer.className = 'chatbot-hidden';

    const chatHeader = document.createElement('div');
    chatHeader.className = 'chatbot-header';
    chatHeader.innerHTML = `
        <div class="chatbot-title">
            <i class="fas fa-wine-glass-alt"></i>
            <span>Помощник wine.not.pmr</span>
        </div>
        <button id="chatbot-clear" class="chatbot-clear-btn" title="Очистить историю">
            <i class="fas fa-trash-alt"></i>
        </button>
        <button id="chatbot-close" class="chatbot-close-btn">
            <i class="fas fa-times"></i>
        </button>
    `;

    const chatBody = document.createElement('div');
    chatBody.className = 'chatbot-body';
    chatBody.innerHTML = `
        <div class="chatbot-welcome">
            <div class="chatbot-message bot-message">
                Привет! Чем могу помочь?
            </div>
        </div>
        <div id="chatbot-messages" class="chatbot-messages"></div>
    `;

    const quickButtons = document.createElement('div');
    quickButtons.className = 'chatbot-quick-buttons';
    quickButtons.innerHTML = `
        <div class="quick-questions-header">
            <span>Быстрые вопросы</span>
            <button id="quick-questions-toggle" class="quick-questions-toggle">
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>
        <div id="quick-questions-content" class="quick-questions-content">
            <button class="chatbot-quick-btn" data-question="Как сделать заказ?">Как сделать заказ?</button>
            <button class="chatbot-quick-btn" data-question="Какие виды бокалов есть?">Виды бокалов</button>
            <button class="chatbot-quick-btn" data-question="Сроки доставки">Сроки доставки</button>
            <button class="chatbot-quick-btn" data-question="Цены на гравировку">Цены</button>
            <button class="chatbot-quick-btn" data-question="Сколько уйдет времени на изготовление бокалов?">Сроки изготовления</button>
            <button class="chatbot-quick-btn" data-question="Какие есть варианты упаковки?">Варианты упаковки</button>
            <button class="chatbot-quick-btn" data-question="Какие гарантии вы предоставляете?">Гарантии</button>
        </div>
    `;

    const chatInput = document.createElement('div');
    chatInput.className = 'chatbot-input';
    chatInput.innerHTML = `
        <input type="text" id="chatbot-user-input" placeholder="Напишите ваш вопрос...">
        <button id="chatbot-send-btn" class="chatbot-send-btn">
            <i class="fas fa-paper-plane"></i>
        </button>
    `;

    chatContainer.appendChild(chatHeader);
    chatContainer.appendChild(chatBody);
    chatContainer.appendChild(quickButtons);
    chatContainer.appendChild(chatInput);

    document.body.appendChild(chatContainer);

    const chatToggle = document.createElement('div');
    chatToggle.id = 'chatbot-toggle';
    chatToggle.className = 'chatbot-toggle';
    chatToggle.innerHTML = '<i class="fas fa-comment-dots"></i>';
    document.body.appendChild(chatToggle);

    setTimeout(() => {
        chatContainer.classList.remove('chatbot-hidden');
        chatContainer.classList.add('chatbot-visible');
    }, 100);

    document.getElementById('chatbot-close').addEventListener('click', toggleChat);
    document.getElementById('chatbot-toggle').addEventListener('click', toggleChat);
    document.getElementById('chatbot-send-btn').addEventListener('click', sendMessage);
    document.getElementById('chatbot-user-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    document.getElementById('quick-questions-toggle').addEventListener('click', function() {
        const content = document.getElementById('quick-questions-content');
        const icon = this.querySelector('i');
        content.classList.toggle('collapsed');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    });

    document.querySelectorAll('.chatbot-quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            addUserMessage(question);
            setTimeout(() => {
                generateBotResponse(question);
            }, 500);
        });
    });

    document.getElementById('chatbot-clear').addEventListener('click', function() {
        sessionStorage.setItem('chatHistory', JSON.stringify([]));
        document.getElementById('chatbot-messages').innerHTML = '';
        document.querySelector('.chatbot-welcome').style.display = 'block';

        // Анимация очистки
        this.classList.add('clearing');
        setTimeout(() => {
            this.classList.remove('clearing');
        }, 500);
    });

    if (!sessionStorage.getItem('chatHistory')) {
        sessionStorage.setItem('chatHistory', JSON.stringify([]));
    }

    const chatHistory = JSON.parse(sessionStorage.getItem('chatHistory'));
    if (chatHistory.length > 0) {
        document.querySelector('.chatbot-welcome').style.display = 'none';
        chatHistory.forEach(msg => {
            if (msg.type === 'user') {
                addUserMessage(msg.text, false);
            } else {
                addBotMessage(msg.text, false);
            }
        });
    }

    function toggleChat() {
        const isVisible = chatContainer.classList.contains('chatbot-visible');
        if (isVisible) {
            chatContainer.classList.remove('chatbot-visible');
            chatContainer.classList.add('chatbot-hidden');
            chatToggle.style.display = 'flex';
        } else {
            chatContainer.classList.remove('chatbot-hidden');
            chatContainer.classList.add('chatbot-visible');
            chatToggle.style.display = 'none';
        }
    }

    function addUserMessage(message, saveToHistory = true) {
        const messagesContainer = document.getElementById('chatbot-messages');
        document.querySelector('.chatbot-welcome').style.display = 'none';
        const messageElement = document.createElement('div');
        messageElement.className = 'chatbot-message user-message';
        messageElement.textContent = message;
        messagesContainer.appendChild(messageElement);
        scrollToBottom();

        if (saveToHistory) {
            saveMessageToHistory(message, 'user');
        }
    }

    function addBotMessage(message, saveToHistory = true) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chatbot-message bot-message';
        messageElement.innerHTML = message;
        messagesContainer.appendChild(messageElement);
        scrollToBottom();

        if (saveToHistory) {
            saveMessageToHistory(message, 'bot');
        }
    }

    function sendMessage() {
        const input = document.getElementById('chatbot-user-input');
        const message = input.value.trim();

        if (message) {
            addUserMessage(message);
            input.value = '';

            setTimeout(() => {
                generateBotResponse(message);
            }, 500);
        }
    }

    function scrollToBottom() {
        const messagesContainer = document.getElementById('chatbot-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function saveMessageToHistory(message, type) {
        const history = JSON.parse(sessionStorage.getItem('chatHistory'));
        history.push({ text: message, type });
        sessionStorage.setItem('chatHistory', JSON.stringify(history));
    }

    function generateBotResponse(question) {
        const exactMatches = {
            "сколько уйдет времени на изготовление бокалов": "manufacturing",
            "сроки изготовления": "manufacturing",
            "когда будет готов заказ": "manufacturing",
            "как сделать заказ": "ordering",
            "как оформить заказ": "ordering",
            "оформление заказа": "ordering",
            "какие виды бокалов есть": "types",
            "какие бокалы у вас есть": "types",
            "бокалы": "types",
            "виды бокалов": "types",
            "каталог": "types",
            "каталог бокалов": "types",
            "какие виды бокалов есть?": "types",
            "сроки доставки": "delivery",
            "когда привезут заказ": "delivery",
            "цены на гравировку": "prices",
            "сколько стоит гравировка": "prices",
            "какие есть варианты упаковки": "packaging",
            "как упаковываете заказы": "packaging",
            "какие гарантии вы предоставляете": "guarantee",
            "гарантии": "guarantee",
            "есть ли гарантия": "guarantee",
            "какие гарантия": "guarantee",
            "что делать, если бокал разбился": "guarantee",
            "разбился бокал": "guarantee",
            "повредилась коробка": "guarantee",
            "вернете деньги": "guarantee",

            "Сколько уйдет времени на изготовление бокалов": "manufacturing",
            "Сроки изготовления": "manufacturing",
            "Когда будет готов заказ": "manufacturing",
            "Как сделать заказ": "ordering",
            "Как оформить заказ": "ordering",
            "Оформление заказа": "ordering",
            "Какие виды бокалов есть": "types",
            "Какие бокалы у вас есть": "types",
            "Бокалы": "types",
            "Виды бокалов": "types",
            "Каталог": "types",
            "Каталог бокалов": "types",
            "Какие виды бокалов есть?": "types",
            "Сроки доставки": "delivery",
            "Когда привезут заказ": "delivery",
            "Цены на гравировку": "prices",
            "Сколько стоит гравировка": "prices",
            "Какие есть варианты упаковки": "packaging",
            "Как упаковываете заказы": "packaging",
            "Какие гарантии вы предоставляете": "guarantee",
            "Гарантии": "guarantee",
            "Есть ли гарантия": "guarantee",
            "Какие гарантия": "guarantee",
            "Что делать, если бокал разбился": "guarantee",
            "Разбился бокал": "guarantee",
            "Повредилась коробка": "guarantee",
            "Вернете деньги": "guarantee"
        };

        if (exactMatches[question.toLowerCase()]) {
            addBotMessage(getResponseByType(exactMatches[question.toLowerCase()]));
            return;
        }

        const keywords = [
            { words: ["изготовлени", "сделают", "производств", "уйдет времени", "готов заказ"], type: "manufacturing", priority: 1 },
            { words: ["заказ", "оформлени", "сделать заказ", "купить"], type: "ordering", priority: 1 },
            { words: ["доставк", "привез", "получу", "придет"], type: "delivery", priority: 1 },
            { words: ["цена", "стоимость", "сколько стоит", "ценник"], type: "prices", priority: 1 },
            { words: ["упаковк", "коробк", "подар", "упаковываете"], type: "packaging", priority: 1 },
            { words: ["гаранти", "вернут", "передела", "качеств", "не понравится", "повредился бокс", "разбился бокал"], type: "guarantee", priority: 1 },
            { words: ["бокал", "виды", "тип", "каталог"], type: "types", priority: 0 }
        ];

        let bestMatch = { type: "default", score: 0 };
        const lowerQuestion = question.toLowerCase();

        keywords.forEach(item => {
            const score = item.words.reduce((total, word) => {
                return total + (lowerQuestion.includes(word) ? item.priority : 0);
            }, 0);

            if (score > bestMatch.score) {
                bestMatch = { type: item.type, score };
            }
        });

        addBotMessage(getResponseByType(bestMatch.type));
    }

    function getResponseByType(type) {
        const responses = {
            "manufacturing": `
                <p>Сроки изготовления бокалов с гравировкой:</p>
                <ul>
                    <li>Стандартные заказы - 1-2 рабочих дня</li>
                    <li>Сложные дизайны - до 3 рабочих дней</li>
                    <li>Оптовые заказы (от 10 шт) - 3-5 рабочих дней</li>
                </ul>
                <p>Мы сообщим вам точную дату готовности после подтверждения заказа.</p>
            `,
            "ordering": `
                <p>Чтобы сделать заказ:</p>
                <ol>
                    <li>Выберите бокал в <a href="catalog.html">каталоге</a></li>
                    <li>Создайте дизайн в <a href="designer.html">конструкторе</a></li>
                    <li>Оформите заказ на странице <a href="order.html">оформления</a></li>
                </ol>
                <p>Или вы можете сразу перейти в <a href="designer.html">конструктор</a> и начать создавать свой уникальный дизайн!</p>
            `,
            "types": `
                <p>У нас есть несколько видов бокалов:</p>
                <ul>
                    <li>🍷 Винные бокалы (420 мл)</li>
                    <li>🍺 Пивные бокалы (500 мл)</li>
                    <li>🥃 Бокалы для виски (300 мл)</li>
                    <li>🥂 Бокалы для шампанского (200 мл)</li>
                    <li>🪵 Бокалы для коньяка (350 мл)</li>
                    <li>❄️ Наборы рюмок для водки (6 шт по 50 мл)</li>
                </ul>
                <p>Посмотреть все варианты можно в <a href="catalog.html">каталоге</a>.</p>
            `,
            "delivery": `
                <p>Сроки доставки отделением почты:</p>
                <ul>
                    <li>В Тирасполе и Бендерах отдаем заказы в центре, согласовав время встречи</li>
                    <li>По ПМР - 2-3 дня</li>
                    <li>По Молдове - 3-6 дней</li>
                </ul>
                <p>Мы отправляем заказы в день изготовления!</p>
            `,
            "prices": `
                <p>Стоимость зависит от кол-во бокалов, на заказы свыше 4х бокалов будет скидка, зависит от типа бокала и упаковки, уточнения после подтверждения заказа или напишите нам в <a href="https://www.instagram.com/wine.not.pmr/">Instagram</a>.:</p>
                <ul>
                    <li>Стоимость бокала - 200 руб</li>
                    <li>При заказе 2х бокалов, скидка 50р - 350 руб</li>
                    <li>В стоимость входит подарочная упаковка (крафт)</li>
                    <li>Бокал в деревянном боксе - 375 руб</li>
                    <li>2 бокала в деревянном боксе - 475 руб</li>
                    <li>Бокал + место под бутылку - 475 руб</li>
                    <li>2 бокала + место под бутылку - 525 руб</li>
                    <li>Набор из 6ти рюмок в деревянном боксе - 475 руб</li>
                    <p>Посмотреть фотографии боксов и крафтовых упаковок можно в <a href="gallery.html">галерее</a>.</p>
                </ul>
                <p>Так же можем изготовить любой бокс под любое кол-во бокалов, для уточнения деталей лучше связаться с нами в <a href="https://www.instagram.com/wine.not.pmr/">Instagram</a>.</p>
            `,
            "packaging": `
                <p>Все наши бокалы поставляются в красивой подарочной упаковке:</p>
                <ul>
                    <li>Картонные коробки с логотипом</li>
                    <li>Деревянные боксы (опционально)</li>
                    <li>Подарочные пакеты (опционально)</li>
                </ul>
                <p>Примеры упаковки можно посмотреть в <a href="gallery.html">галерее</a>.</p>
            `,
            "guarantee": `
                <p>Мы гарантируем качество нашей продукции!</p>
                <ul>
                    <li>Если вам что-то не понравится - мы вернем деньги или переделаем заказ</li>
                    <li>Гравировка выполняется на современном лазерном оборудовании</li>
                    <li>Надписи не стираются со временем</li>
                    <li>Используем только качественные материалы</li>
                    <li>Каждый бокал проверяется перед отправкой</li>
                </ul>
                <p>Ваше удовлетворение - наш главный приоритет!</p>
            `,
            "default": `
                <p>Извините, я не совсем понял ваш вопрос.</p>
                <p>Вы можете:</p>
                <ul>
                    <li>Посмотреть <a href="catalog.html">каталог</a> бокалов</li>
                    <li>Создать свой дизайн в <a href="designer.html">конструкторе</a></li>
                    <li>Написать нам в <a href="https://instagram.com/wine.not.pmr">Instagram</a></li>
                </ul>
                <p>Или задайте другой вопрос, я постараюсь помочь!</p>
            `
        };

        return responses[type] || responses["default"];
    }
}