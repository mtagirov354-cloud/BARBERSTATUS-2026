// ==================== НАСТРОЙКИ ====================
const API_URL = window.location.origin; // Автоматически определяем URL

// ==================== ОБРАБОТКА ФОРМЫ ЗАПИСИ ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Сайт загружен, настраиваю формы...');
    
    // 1. Форма записи
    const orderForm = document.getElementById('bookingForm');
    if (orderForm) {
        console.log('Форма записи найдена');
        orderForm.addEventListener('submit', handleBookingSubmit);
        
        // Установка минимальной даты (сегодня)
        const dateInput = orderForm.querySelector('input[type="date"]');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            dateInput.value = today;
        }
    } else {
        console.log('Форма записи НЕ найдена! Проверьте id="bookingForm"');
    }
    
    // 2. Форма отзыва
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        console.log('Форма отзывов найдена');
        reviewForm.addEventListener('submit', handleReviewSubmit);
        
        // Настройка звезд рейтинга
        setupRatingStars();
    } else {
        console.log('Форма отзывов НЕ найдена! Проверьте id="reviewForm"');
    }
    
    // 3. Загрузка отзывов
    loadReviews();
    
    // 4. Загрузка услуг для выпадающего списка
    loadServices();
});

// ==================== ЗАГРУЗКА УСЛУГ ====================
function loadServices() {
    const services = [
        "Мужская стрижка",
        "Бритье опасным лезвием",
        "Стрижка машинкой",
        "Детская стрижка",
        "Стрижка + Бритье",
        "Королевское бритье",
        "Оформление бороды",
        "Камуфляж седины",
        "Черная маска"
    ];
    
    const serviceSelects = document.querySelectorAll('select[name="service"], #service');
    serviceSelects.forEach(select => {
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            select.appendChild(option);
        });
    });
}

// ==================== ОБРАБОТКА ЗАПИСИ ====================
async function handleBookingSubmit(event) {
    event.preventDefault();
    console.log('Отправка формы записи...');
    
    const form = event.target;
    const formData = {
        service: form.querySelector('select[name="service"], #service').value,
        date: form.querySelector('input[type="date"]').value,
        time: form.querySelector('input[type="time"], #time').value,
        name: form.querySelector('input[name="name"], #name').value,
        phone: form.querySelector('input[name="phone"], #phone').value
    };
    
    console.log('Данные формы:', formData);
    
    // Валидация
    if (!formData.name || !formData.phone || !formData.service || !formData.date || !formData.time) {
        showAlert('⚠️ Заполните все поля!', 'warning');
        return;
    }
    
    // Показать загрузку
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('✅ Заявка отправлена! Мы скоро свяжемся с вами.', 'success');
            form.reset();
            
            // Отправить уведомление в консоль (для админа)
            console.log('📞 НОВАЯ ЗАЯВКА:', {
                имя: formData.name,
                телефон: formData.phone,
                услуга: formData.service,
                дата: formData.date,
                время: formData.time
            });
            
        } else {
            showAlert(`❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showAlert('❌ Ошибка соединения. Проверьте интернет.', 'error');
    } finally {
        // Восстановить кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ==================== ОБРАБОТКА ОТЗЫВОВ ====================
function setupRatingStars() {
    const stars = document.querySelectorAll('.star-rating .star');
    if (stars.length === 0) return;
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('data-value');
            const container = this.closest('.star-rating');
            
            // Установить значение скрытого поля
            const hiddenInput = container.querySelector('input[type="hidden"]');
            if (hiddenInput) hiddenInput.value = rating;
            
            // Подсветить звезды
            stars.forEach(s => {
                if (s.getAttribute('data-value') <= rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
            
            console.log('Выбран рейтинг:', rating);
        });
    });
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    console.log('Отправка отзыва...');
    
    const form = event.target;
    const formData = {
        name: form.querySelector('input[name="name"], #reviewName').value,
        rating: form.querySelector('input[name="rating"], #rating').value || '5',
        service: form.querySelector('select[name="service"], #reviewService').value || 'Не указана',
        text: form.querySelector('textarea[name="text"], #reviewText').value
    };
    
    console.log('Данные отзыва:', formData);
    
    // Валидация
    if (!formData.name || !formData.text) {
        showAlert('⚠️ Укажите имя и текст отзыва!', 'warning');
        return;
    }
    
    // Показать загрузку
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('✅ Спасибо за отзыв! Он появится после проверки.', 'success');
            form.reset();
            
            // Сбросить звезды
            document.querySelectorAll('.star-rating .star').forEach(star => {
                star.classList.remove('active');
            });
            
            // Обновить список отзывов
            loadReviews();
            
        } else {
            showAlert(`❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showAlert('❌ Ошибка соединения.', 'error');
    } finally {
        // Восстановить кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ==================== ЗАГРУЗКА ОТЗЫВОВ ====================
async function loadReviews() {
    try {
        const response = await fetch('/api/reviews?approved=true');
        const reviews = await response.json();
        
        console.log('Загружено отзывов:', reviews.length);
        
        // Отображаем отзывы
        displayReviews(reviews);
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
    }
}

function displayReviews(reviews) {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    // Сортируем по дате (новые сначала)
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Показываем только последние 10
    const recentReviews = reviews.slice(0, 10);
    
    if (recentReviews.length === 0) {
        container.innerHTML = '<p class="no-reviews">Пока нет отзывов. Будьте первым!</p>';
        return;
    }
    
    container.innerHTML = recentReviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <h4>${review.name}</h4>
                <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
            </div>
            ${review.service ? `<p class="review-service">Услуга: ${review.service}</p>` : ''}
            <p class="review-text">${review.text}</p>
            <p class="review-date">${formatReviewDate(review.date)}</p>
        </div>
    `).join('');
}

function formatReviewDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// ==================== УВЕДОМЛЕНИЯ ====================
function showAlert(message, type = 'info') {
    // Создаем уведомление
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
        max-width: 400px;
    `;
    
    document.body.appendChild(alert);
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .no-reviews {
        text-align: center;
        color: #666;
        padding: 20px;
    }
    
    .review-item {
        background: #f9f9f9;
        padding: 15px;
        margin-bottom: 15px;
        border-radius: 5px;
        border-left: 4px solid #333;
    }
    
    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .review-rating {
        color: #ffc107;
        font-size: 18px;
    }
    
    .review-service {
        color: #666;
        font-size: 14px;
        margin-bottom: 8px;
    }
    
    .review-text {
        margin-bottom: 10px;
        line-height: 1.5;
    }
    
    .review-date {
        color: #888;
        font-size: 12px;
        text-align: right;
    }
`;
document.head.appendChild(style);

// ==================== ДЕБАГ ИНФОРМАЦИЯ ====================
console.log('=== BARBER STATUS 2026 ===');
console.log('API URL:', API_URL);
console.log('Формы настроены и готовы к работе!');
