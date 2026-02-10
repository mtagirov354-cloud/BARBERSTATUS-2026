// Автоматическое определение API URL
const API_BASE = window.location.origin;

// Отправка заявки
async function submitOrder(event) {
    event.preventDefault();
    
    const formData = {
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value
    };
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('✅ Заявка отправлена! Мы скоро свяжемся с вами.');
            event.target.reset();
        } else {
            alert('❌ Ошибка при отправке заявки');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка соединения. Проверьте интернет.');
    }
}

// Отправка отзыва
async function submitReview(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('reviewName').value,
        rating: parseInt(document.getElementById('rating').value),
        service: document.getElementById('reviewService').value,
        text: document.getElementById('reviewText').value
    };
    
    try {
        const response = await fetch('/api/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('✅ Спасибо за отзыв! Он появится после модерации.');
            event.target.reset();
        } else {
            alert('❌ Ошибка при отправке отзыва');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка соединения');
    }
}

// Загрузка отзывов
async function loadReviews() {
    try {
        const response = await fetch('/api/reviews?approved=true');
        const reviews = await response.json();
        
        // Отображаем отзывы на странице
        const reviewsContainer = document.getElementById('reviewsContainer');
        if (reviewsContainer) {
            reviewsContainer.innerHTML = reviews.map(review => `
                <div class="review">
                    <h4>${review.name} • ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</h4>
                    <p>${review.service}</p>
                    <p>${review.text}</p>
                    <small>${new Date(review.date).toLocaleDateString('ru-RU')}</small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Привязка форм
    const orderForm = document.getElementById('orderForm');
    const reviewForm = document.getElementById('reviewForm');
    
    if (orderForm) {
        orderForm.addEventListener('submit', submitOrder);
    }
    
    if (reviewForm) {
        reviewForm.addEventListener('submit', submitReview);
    }
    
    // Загрузка отзывов
    loadReviews();
    
    // Установка минимальной даты (сегодня)
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
});
