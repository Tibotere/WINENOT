/* WINENOT Order System v2.0 - Полная интеграция с 1С */
document.addEventListener('DOMContentLoaded', function() {
    initOrderSystem();
});

/**
 * Инициализация системы заказов
 */
function initOrderSystem() {
    // Инициализация компонентов
    initPhoneMask();
    loadOrderSummary();
    setupFormSubmit();
    setupModalClose();
}

/**
 * Инициализация маски телефона
 */
function initPhoneMask() {
    const phoneInput = document.getElementById('client-phone');
    if (phoneInput && typeof Inputmask !== 'undefined') {
        new Inputmask('+7 (999) 999-99-99').mask(phoneInput);
    }
}

/**
 * Загрузка и отображение сводки заказа
 */
async function loadOrderSummary() {
    const summaryElement = document.getElementById('order-summary');
    if (!summaryElement) return;

    const cart = getCart();
    if (!cart || cart.length === 0) {
        summaryElement.innerHTML = '<div class="empty-cart">Ваша корзина пуста</div>';
        return;
    }

    // Загружаем актуальные цены и себестоимости
    const enrichedCart = await enrichCartWithCosts(cart);
    saveCart(enrichedCart);

    // Формируем HTML
    let html = `
        <div class="order-header">
            <h3><i class="fas fa-shopping-cart"></i> Ваш заказ</h3>
        </div>
        <ul class="order-items">
    `;

    let total = 0;
    let totalCost = 0;
    let totalProfit = 0;

    enrichedCart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const itemCost = item.costPrice * item.quantity;
        const itemProfit = itemTotal - itemCost;

        total += itemTotal;
        totalCost += itemCost;
        totalProfit += itemProfit;

        html += `
            <li class="order-item">
                <div class="item-main">
                    <span class="item-name">${escapeHtml(item.product)}</span>
                    <span class="item-quantity">${item.quantity} × ${formatPrice(item.price)} руб.</span>
                    <span class="item-total">${formatPrice(itemTotal)} руб.</span>
                </div>
                ${renderDesignDetails(item)}
                <div class="item-cost">
                    <small>Себестоимость: ${formatPrice(itemCost)} руб.</small>
                </div>
            </li>
        `;
    });

    html += `</ul>`;

    // Добавляем блок с итогами
    html += `
        <div class="order-totals">
            <div class="total-row">
                <span>Итого:</span>
                <span class="total-value">${formatPrice(total)} руб.</span>
            </div>
            <div class="cost-row">
                <span>Себестоимость:</span>
                <span class="cost-value">${formatPrice(totalCost)} руб.</span>
            </div>
            <div class="profit-row">
                <span>Прибыль:</span>
                <span class="profit-value">${formatPrice(totalProfit)} руб.</span>
            </div>
        </div>
    `;

    summaryElement.innerHTML = html;
}

/**
 * Обработчик отправки формы
 */
function setupFormSubmit() {
    const form = document.getElementById('order-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await processOrder();
        });
    }
}

/**
 * Основная функция обработки заказа
 */
async function processOrder() {
    // Валидация формы
    if (!validateForm()) {
        showError('Пожалуйста, заполните все обязательные поля');
        return;
    }

    const cart = getCart();
    if (!cart || cart.length === 0) {
        showError('Ваша корзина пуста');
        return;
    }

    showLoading(true);

    try {
        // Подготовка данных
        const orderData = {
            client: {
                name: getValue('client-name'),
                phone: normalizePhone(getValue('client-phone')),
                email: getValue('client-email') || null,
                address: getValue('client-address')
            },
            items: cart.map(item => ({
                product: item.product,
                quantity: item.quantity,
                price: item.price,
                costPrice: item.costPrice,
                design: item.design || null
            })),
            comment: getValue('client-comment') || null
        };

        // Отправка в 1С
        const result = await sendTo1C(orderData);

        if (result.startsWith('OK')) {
            clearCart();
            window.location.href = 'success.html?order=' + encodeURIComponent(result.split('|')[1]);
        } else {
            throw new Error(result.split('|')[1] || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('Order Error:', error);
        showError(`Ошибка при оформлении заказа: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

/**
 * Отправка данных в 1С
 */
async function sendTo1C(orderData) {
    // Вариант 1: COM-соединение (IE)
    if (typeof ActiveXObject !== 'undefined') {
        try {
            const com1C = new ActiveXObject("V83.COMConnector");
            const connection = com1C.Connect("File=\"C:\\WINENOT_Orders\\\"");
            const handler = connection.ПриемЗаказовССайта;
            return handler.СоздатьЗаказ(JSON.stringify(orderData));
        } catch (e) {
            throw new Error('COM Error: ' + e.message);
        }
    }
    // Вариант 2: HTTP-сервис
    else {
        try {
            const response = await fetch('http://localhost:8080/hs/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.text();
        } catch (e) {
            throw new Error('HTTP Error: ' + e.message);
        }
    }
}

/**
 * Загрузка себестоимостей из 1С
 */
async function enrichCartWithCosts(cart) {
    const productNames = cart.map(item => item.product);
    
    try {
        // Вариант 1: COM
        if (typeof ActiveXObject !== 'undefined') {
            const com1C = new ActiveXObject("V83.COMConnector");
            const connection = com1C.Connect("File=\"C:\\WINENOT_Orders\\\"");
            const handler = connection.ПриемЗаказовССайта;
            const result = handler.ПолучитьСебестоимости(JSON.stringify({ items: productNames }));
            return applyCostsToCart(cart, JSON.parse(result));
        }
        // Вариант 2: HTTP
        else {
            const response = await fetch('http://localhost:8080/hs/orders/costs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: productNames })
            });
            
            if (!response.ok) throw new Error('Cost fetch failed');
            
            const data = await response.json();
            return applyCostsToCart(cart, data);
        }
    } catch (error) {
        console.error('Cost loading error:', error);
        return cart.map(item => ({
            ...item,
            costPrice: 0,
            price: item.price || 0
        }));
    }
}

/**
 * Применение себестоимостей к корзине
 */
function applyCostsToCart(cart, costData) {
    return cart.map(item => {
        const productInfo = costData.find(p => p.Наименование === item.product) || {};
        return {
            ...item,
            costPrice: productInfo.Себестоимость || 0,
            price: item.price || productInfo.РекомендуемаяЦена || 0
        };
    });
}

/**
 * Работа с корзиной (localStorage)
 */
function getCart() {
    const cartJson = localStorage.getItem('winentot_cart');
    return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
    localStorage.setItem('winentot_cart', JSON.stringify(cart));
}

function clearCart() {
    localStorage.removeItem('winentot_cart');
    localStorage.removeItem('winentot_design');
}

/**
 * Валидация формы
 */
function validateForm() {
    let isValid = true;
    const requiredFields = ['client-name', 'client-phone', 'client-address'];

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            markField(fieldId, false);
            isValid = false;
        } else {
            markField(fieldId, true);
        }
    });

    // Валидация email
    const email = document.getElementById('client-email');
    if (email && email.value.trim() && !validateEmail(email.value)) {
        markField('client-email', false);
        isValid = false;
    }

    return isValid;
}

/**
 * Вспомогательные функции
 */
function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function markField(id, isValid) {
    const field = document.getElementById(id);
    if (!field) return;
    
    field.classList.toggle('is-invalid', !isValid);
    field.classList.toggle('is-valid', isValid);
}

function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

function escapeHtml(unsafe) {
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderDesignDetails(item) {
    if (!item.design) return '';
    
    let details = '';
    if (item.design.text) {
        details = `Текст: "${escapeHtml(item.design.text)}"`;
    } else if (item.design.templateId) {
        details = `Шаблон: #${item.design.templateId}`;
    } else if (item.design.elements) {
        details = `Элементы: ${item.design.elements.join(', ')}`;
    }
    
    return details ? `<div class="design-details"><small>${details}</small></div>` : '';
}

/**
 * UI функции
 */
function showLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    const modal = document.getElementById('error-modal');
    const messageElement = document.getElementById('error-message');
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        modal.style.display = 'block';
    }
}

function setupModalClose() {
    const closeButtons = document.querySelectorAll('.modal .close, .modal .overlay');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('error-modal').style.display = 'none';
        });
    });
}

// Обработчик кликов вне модального окна
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById('error-modal')) {
        document.getElementById('error-modal').style.display = 'none';
    }
});
