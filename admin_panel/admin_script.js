// Автоматическое определение URL для админки
const API_BASE = window.location.origin; // Текущий домен

let currentOrderId = null;
let currentReviewId = null;
const modal = document.getElementById('statusModal');
const closeBtn = document.querySelector('.close');
const saveBtn = document.getElementById('saveStatus');

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    checkAuthAndLoadData();
    setupEventListeners();
});

// Проверка аутентификации и загрузка данных
async function checkAuthAndLoadData() {
    try {
        await loadOrders();
        await loadReviews();
    } catch (error) {
        if (error.status === 401) {
            // Не авторизован
            window.location.href = '/admin';
            return;
        }
        console.error('Ошибка загрузки данных:', error);
        showNotification('❌ Ошибка загрузки данных', 'error');
    }
}

// Обновление даты
function updateDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('ru-RU', options);
}

// Загрузка заявок
async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        
        if (response.status === 401) {
            throw { status: 401, message: 'Требуется авторизация' };
        }
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const orders = await response.json();
        displayOrders(orders);
        updateStats(orders);
    } catch (error) {
        if (error.status === 401) {
            throw error;
        }
        console.error('Ошибка загрузки заявок:', error);
        showNotification('❌ Ошибка загрузки заявок', 'error');
    }
}

// Отображение заявок
function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    const filteredOrders = orders.filter(order => {
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;
        if (dateFilter && order.date !== dateFilter) return false;
        return true;
    });
    
    filteredOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${formatDate(order.date)}</td>
            <td>${order.time}</td>
            <td>${order.name}</td>
            <td><a href="tel:${order.phone}">${order.phone}</a></td>
            <td>${order.service}</td>
            <td><span class="status-badge status-${getStatusClass(order.status)}">${order.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action" onclick="changeStatus(${order.id}, '${order.name}', '${order.service}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action" onclick="deleteOrder(${order.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Обновление статистики
function updateStats(orders) {
    const now = new Date().toISOString().split('T')[0];
    
    const newOrders = orders.filter(o => o.status === 'Новая').length;
    const todayOrders = orders.filter(o => o.date === now).length;
    const completedOrders = orders.filter(o => o.status === 'Выполнена').length;
    const totalOrders = orders.length;
    
    document.getElementById('newOrders').textContent = newOrders;
    document.getElementById('todayOrders').textContent = todayOrders;
    document.getElementById('completedOrders').textContent = completedOrders;
    document.getElementById('totalOrders').textContent = totalOrders;
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Класс для статуса
function getStatusClass(status) {
    const classes = {
        'Новая': 'new',
        'Подтверждена': 'confirmed',
        'Выполнена': 'completed',
        'Отменена': 'cancelled'
    };
    return classes[status] || 'new';
}

// Настройка обработчиков
function setupEventListeners() {
    // Кнопка обновления
    document.getElementById('refreshBtn').addEventListener('click', () => {
        checkAuthAndLoadData();
        showNotification('✅ Данные обновлены', 'success');
    });
    
    // Фильтры
    document.getElementById('statusFilter').addEventListener('change', () => loadOrders().catch(console.error));
    document.getElementById('dateFilter').addEventListener('change', () => loadOrders().catch(console.error));
    
    // Модальное окно
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    saveBtn.addEventListener('click', saveStatus);
    
    // Клик вне модалки
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    // Автообновление
    setInterval(() => {
        loadOrders().catch(console.error);
        loadReviews().catch(console.error);
    }, 30000);
}

// Изменение статуса
function changeStatus(id, name, service) {
    currentOrderId = id;
    document.getElementById('modalOrderInfo').textContent = 
        `Заявка #${id}: ${name} - ${service}`;
    
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.style.opacity = '1';
    });
    
    modal.style.display = 'block';
}

// Сохранение статуса
async function saveStatus() {
    if (!currentOrderId) return;
    
    const activeBtn = document.querySelector('.status-btn[style*="opacity: 0.7"]');
    if (!activeBtn) {
        showNotification('⚠️ Выберите статус', 'warning');
        return;
    }
    
    const newStatus = activeBtn.dataset.status;
    
    try {
        const response = await fetch(`/api/order/${currentOrderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            modal.style.display = 'none';
            await loadOrders();
            showNotification(`✅ Статус изменен на "${newStatus}"`, 'success');
        } else {
            throw new Error('Ошибка обновления');
        }
    } catch (error) {
        console.error('Ошибка обновления:', error);
        showNotification('❌ Ошибка обновления', 'error');
    }
}

// Удаление заявки
async function deleteOrder(id) {
    if (!confirm('Удалить эту заявку?')) return;
    
    try {
        const response = await fetch(`/api/order/${id}`, {
            method: 'DELETE'
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadOrders();
            showNotification(`✅ Заявка #${id} удалена`, 'success');
        } else {
            throw new Error('Ошибка удаления');
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification('❌ Ошибка удаления', 'error');
    }
}

// Загрузка отзывов
async function loadReviews() {
    try {
        const response = await fetch('/api/reviews');
        
        if (response.status === 401) {
            throw { status: 401, message: 'Требуется авторизация' };
        }
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const reviews = await response.json();
        displayReviewsInAdmin(reviews);
    } catch (error) {
        if (error.status === 401) {
            throw error;
        }
        console.error('Ошибка загрузки отзывов:', error);
        showNotification('❌ Ошибка загрузки отзывов', 'error');
    }
}

// Отображение отзывов в админке
function displayReviewsInAdmin(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    reviews.forEach(review => {
        const row = document.createElement('tr');
        const date = new Date(review.date);
        const formattedDate = date.toLocaleDateString('ru-RU');
        
        let statusText, statusClass;
        if (review.approved === true) {
            statusText = 'Одобрен';
            statusClass = 'approved';
        } else if (review.approved === false) {
            statusText = 'На модерации';
            statusClass = 'pending';
        } else {
            statusText = 'Отклонен';
            statusClass = 'rejected';
        }
        
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= review.rating ? '★' : '☆';
        }
        
        row.innerHTML = `
            <td>${review.id}</td>
            <td>${formattedDate}</td>
            <td>${review.name}</td>
            <td>${review.service || '—'}</td>
            <td>${stars}</td>
            <td>${review.text.substring(0, 50)}${review.text.length > 50 ? '...' : ''}</td>
            <td><span class="review-status status-${statusClass}">${statusText}</span></td>
            <td>
                <div class="review-actions">
                    ${review.approved !== true ? 
                        `<button class="review-action-btn approve" onclick="approveReview(${review.id})">
                            <i class="fas fa-check"></i>
                        </button>` : ''}
                    
                    ${review.approved !== false ? 
                        `<button class="review-action-btn reject" onclick="rejectReview(${review.id})">
                            <i class="fas fa-times"></i>
                        </button>` : ''}
                    
                    <button class="review-action-btn delete" onclick="deleteReview(${review.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Одобрить отзыв
async function approveReview(id) {
    try {
        const response = await fetch(`/api/review/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approved: true })
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadReviews();
            showNotification(`✅ Отзыв одобрен`, 'success');
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка', 'error');
    }
}

// Отклонить отзыв
async function rejectReview(id) {
    try {
        const response = await fetch(`/api/review/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approved: null })
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadReviews();
            showNotification(`✅ Отзыв отклонен`, 'success');
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка', 'error');
    }
}

// Удалить отзыв
async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв?')) return;
    
    try {
        const response = await fetch(`/api/review/${id}`, {
            method: 'DELETE'
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadReviews();
            showNotification(`✅ Отзыв удален`, 'success');
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка', 'error');
    }
}

// Уведомления
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#222' : type === 'warning' ? '#332200' : '#331111'};
        color: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#ff6b6b'};
        border: 1px solid ${type === 'success' ? '#333' : type === 'warning' ? '#664400' : '#662222'};
        border-radius: 2px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавить стили для анимаций
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
`;
document.head.appendChild(style);
