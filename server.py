from flask import Flask, request, jsonify, send_from_directory, session, redirect
from flask_cors import CORS
import json
import os
from datetime import datetime
from pathlib import Path

app = Flask(__name__, static_folder=None)
CORS(app, supports_credentials=True)

# Конфигурация
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'barber_status_2026_local_key'),
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax'
)

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'BARBERSTATUSADM')
PORT = int(os.environ.get('PORT', 10000))

# Пути к файлам - ИСПРАВЛЕНО!
BASE_DIR = Path(__file__).parent  # Это barber_status_project/
ORDERS_FILE = BASE_DIR / "admin_panel" / "orders.json"
REVIEWS_FILE = BASE_DIR / "admin_panel" / "reviews.json"
CLIENT_DIR = BASE_DIR / "client_site"
ADMIN_DIR = BASE_DIR / "admin_panel"

print(f"BASE_DIR: {BASE_DIR}")
print(f"CLIENT_DIR: {CLIENT_DIR}")
print(f"CLIENT_DIR exists: {CLIENT_DIR.exists()}")
print(f"ADMIN_DIR exists: {ADMIN_DIR.exists()}")

# Вспомогательные функции - ПЕРЕМЕСТИЛИ В НАЧАЛО!
def read_data(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def write_data(file_path, data):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Ошибка записи в файл {file_path}: {e}")
        return False

def generate_id(data):
    if not data:
        return 1
    return max([item.get('id', 0) for item in data]) + 1

# Инициализация файлов
def init_files():
    print("Инициализация файлов...")
    
    # Тестовые данные
    default_orders = [
        {
            "id": 1,
            "service": "Мужская стрижка",
            "date": "2026-02-15",
            "time": "14:00",
            "name": "Иван Петров",
            "phone": "+7 900 123-45-67",
            "timestamp": "2026-02-11T10:30:00",
            "status": "Подтверждена"
        }
    ]
    
    default_reviews = [
        {
            "id": 1,
            "name": "Александр",
            "rating": 5,
            "service": "Мужская стрижка",
            "text": "Отличный барбершоп! Мастер настоящий профессионал.",
            "date": "2026-02-10T14:30:00",
            "approved": True
        }
    ]
    
    try:
        if not ORDERS_FILE.exists():
            ORDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(default_orders, f, ensure_ascii=False, indent=2)
            print(f"Создан файл заказов: {ORDERS_FILE}")
        
        if not REVIEWS_FILE.exists():
            REVIEWS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(REVIEWS_FILE, 'w', encoding='utf-8') as f:
                json.dump(default_reviews, f, ensure_ascii=False, indent=2)
            print(f"Создан файл отзывов: {REVIEWS_FILE}")
    except Exception as e:
        print(f"Ошибка при создании файлов: {e}")

# Проверка аутентификации
def check_auth():
    return session.get('authenticated', False)

# Декоратор для защиты API
def require_auth(f):
    def decorated_function(*args, **kwargs):
        if not check_auth():
            return jsonify({'error': 'Требуется авторизация'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# ========== РОУТЫ ДЛЯ КЛИЕНТСКОГО САЙТА ==========

@app.route('/')
def index():
    print("Запрос главной страницы")
    try:
        return send_from_directory(CLIENT_DIR, 'index.html')
    except Exception as e:
        return f"Ошибка загрузки index.html: {e}", 500

# Статические файлы клиентского сайта
@app.route('/<path:filename>')
def client_static(filename):
    print(f"Запрос клиентского файла: {filename}")
    
    # Разрешенные расширения
    allowed_extensions = {'.css', '.js', '.html', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'}
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        return "Формат файла не поддерживается", 404
    
    try:
        return send_from_directory(CLIENT_DIR, filename)
    except Exception as e:
        print(f"Ошибка загрузки файла {filename}: {e}")
        return "Файл не найден", 404

# ========== РОУТЫ ДЛЯ АДМИН-ПАНЕЛИ ==========

@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'GET':
        print("Запрос страницы входа в админку")
        try:
            return send_from_directory(ADMIN_DIR, 'login.html')
        except Exception as e:
            return f"Ошибка загрузки login.html: {e}", 500
    
    # POST запрос - проверка пароля
    password = request.form.get('password', '')
    print(f"Попытка входа в админку")
    
    if password == ADMIN_PASSWORD:
        session['authenticated'] = True
        print("Успешный вход в админку")
        return redirect('/admin/admin.html')
    else:
        print("Неверный пароль для админки")
        return '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>BARBER STATUS 2026 - Ошибка входа</title>
            <style>
                body {
                    background: #000;
                    color: #fff;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .login-container {
                    background: #111;
                    padding: 3rem;
                    border-radius: 2px;
                    border: 1px solid #333;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                h1 {
                    color: #fff;
                    margin-bottom: 2rem;
                }
                .error {
                    color: #ff6b6b;
                    margin: 1rem 0;
                    padding: 1rem;
                    background: rgba(255, 107, 107, 0.1);
                    border-radius: 2px;
                }
                .btn {
                    background: #fff;
                    color: #000;
                    padding: 0.8rem 2rem;
                    text-decoration: none;
                    border-radius: 2px;
                    border: 2px solid #fff;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: inline-block;
                    margin-top: 1rem;
                }
                .btn:hover {
                    background: transparent;
                    color: #fff;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1>BARBER STATUS 2026</h1>
                <div class="error">❌ Неверный пароль. Попробуйте снова.</div>
                <a href="/admin" class="btn">Вернуться к входу</a>
            </div>
        </body>
        </html>
        ''', 401

@app.route('/admin/logout')
def admin_logout():
    session.pop('authenticated', None)
    print("Выход из админки")
    return redirect('/admin')

@app.route('/admin/<path:filename>')
def admin_static(filename):
    print(f"Запрос админского файла: {filename}")
    
    # Защита admin.html
    if filename == 'admin.html' and not check_auth():
        print("Попытка доступа к admin.html без авторизации")
        return redirect('/admin')
    
    # Разрешенные расширения
    allowed_extensions = {'.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'}
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        return "Формат файла не поддерживается", 404
    
    try:
        return send_from_directory(ADMIN_DIR, filename)
    except Exception as e:
        print(f"Ошибка загрузки админ файла {filename}: {e}")
        return "Файл не найден", 404

# ========== API РОУТЫ ==========

# API заказов
@app.route('/api/order', methods=['POST'])
def create_order():
    try:
        orders = read_data(ORDERS_FILE)
        order = request.json
        
        # Валидация
        required_fields = ['service', 'date', 'time', 'name', 'phone']
        for field in required_fields:
            if field not in order or not str(order[field]).strip():
                return jsonify({'error': f'Поле {field} обязательно'}), 400
        
        order['id'] = generate_id(orders)
        order['timestamp'] = datetime.now().isoformat()
        order['status'] = 'Новая'
        
        orders.append(order)
        if write_data(ORDERS_FILE, orders):
            print(f"Создан новый заказ #{order['id']}: {order['name']} - {order['service']}")
            return jsonify(order), 201
        else:
            return jsonify({'error': 'Ошибка сохранения'}), 500
            
    except Exception as e:
        print(f"Ошибка создания заказа: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
@require_auth
def get_orders():
    try:
        orders = read_data(ORDERS_FILE)
        orders.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return jsonify(orders)
    except Exception as e:
        print(f"Ошибка получения заказов: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/order/<int:order_id>', methods=['PUT'])
@require_auth
def update_order(order_id):
    try:
        orders = read_data(ORDERS_FILE)
        order_found = False
        
        for order in orders:
            if order['id'] == order_id:
                order_found = True
                data = request.json
                if 'status' in data:
                    old_status = order['status']
                    order['status'] = data['status']
                    print(f"Статус заказа #{order_id} изменен: {old_status} → {order['status']}")
                
                if write_data(ORDERS_FILE, orders):
                    return jsonify(order)
                else:
                    return jsonify({'error': 'Ошибка сохранения'}), 500
        
        if not order_found:
            return jsonify({'error': 'Заказ не найден'}), 404
            
    except Exception as e:
        print(f"Ошибка обновления заказа #{order_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/order/<int:order_id>', methods=['DELETE'])
@require_auth
def delete_order(order_id):
    try:
        orders = read_data(ORDERS_FILE)
        new_orders = [order for order in orders if order['id'] != order_id]
        
        if len(new_orders) == len(orders):
            return jsonify({'error': 'Заказ не найден'}), 404
        
        if write_data(ORDERS_FILE, new_orders):
            print(f"Удален заказ #{order_id}")
            return jsonify({'message': 'Заказ удален'})
        else:
            return jsonify({'error': 'Ошибка сохранения'}), 500
            
    except Exception as e:
        print(f"Ошибка удаления заказа #{order_id}: {e}")
        return jsonify({'error': str(e)}), 500

# API отзывов
@app.route('/api/review', methods=['POST'])
def create_review():
    try:
        reviews = read_data(REVIEWS_FILE)
        review = request.json
        
        required_fields = ['name', 'rating', 'text']
        for field in required_fields:
            if field not in review or not str(review[field]).strip():
                return jsonify({'error': f'Поле {field} обязательно'}), 400
        
        try:
            rating = int(review['rating'])
            if not 1 <= rating <= 5:
                return jsonify({'error': 'Рейтинг должен быть от 1 до 5'}), 400
        except ValueError:
            return jsonify({'error': 'Некорректный рейтинг'}), 400
        
        review['id'] = generate_id(reviews)
        review['date'] = datetime.now().isoformat()
        review['approved'] = False
        
        reviews.append(review)
        if write_data(REVIEWS_FILE, reviews):
            print(f"Создан новый отзыв #{review['id']} от {review['name']}")
            return jsonify(review), 201
        else:
            return jsonify({'error': 'Ошибка сохранения'}), 500
            
    except Exception as e:
        print(f"Ошибка создания отзыва: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    try:
        reviews = read_data(REVIEWS_FILE)
        
        # Для клиентов - только одобренные
        if request.args.get('approved') == 'true':
            reviews = [r for r in reviews if r.get('approved') == True]
        
        reviews.sort(key=lambda x: x.get('date', ''), reverse=True)
        return jsonify(reviews)
    except Exception as e:
        print(f"Ошибка получения отзывов: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/review/<int:review_id>', methods=['GET'])
@require_auth
def get_review(review_id):
    try:
        reviews = read_data(REVIEWS_FILE)
        for review in reviews:
            if review['id'] == review_id:
                return jsonify(review)
        return jsonify({'error': 'Отзыв не найден'}), 404
    except Exception as e:
        print(f"Ошибка получения отзыва #{review_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/review/<int:review_id>', methods=['PUT'])
@require_auth
def update_review(review_id):
    try:
        reviews = read_data(REVIEWS_FILE)
        review_found = False
        
        for review in reviews:
            if review['id'] == review_id:
                review_found = True
                data = request.json
                if 'approved' in data:
                    old_status = review.get('approved')
                    review['approved'] = data['approved']
                    
                    status_map = {True: "одобрен", False: "на модерации", None: "отклонен"}
                    status_text = status_map.get(data['approved'], "изменен")
                    print(f"Отзыв #{review_id} {status_text}")
                
                if write_data(REVIEWS_FILE, reviews):
                    return jsonify(review)
                else:
                    return jsonify({'error': 'Ошибка сохранения'}), 500
        
        if not review_found:
            return jsonify({'error': 'Отзыв не найден'}), 404
            
    except Exception as e:
        print(f"Ошибка обновления отзыва #{review_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/review/<int:review_id>', methods=['DELETE'])
@require_auth
def delete_review(review_id):
    try:
        reviews = read_data(REVIEWS_FILE)
        new_reviews = [r for r in reviews if r['id'] != review_id]
        
        if len(new_reviews) == len(reviews):
            return jsonify({'error': 'Отзыв не найден'}), 404
        
        if write_data(REVIEWS_FILE, new_reviews):
            print(f"Удален отзыв #{review_id}")
            return jsonify({'message': 'Отзыв удален'})
        else:
            return jsonify({'error': 'Ошибка сохранения'}), 500
            
    except Exception as e:
        print(f"Ошибка удаления отзыва #{review_id}: {e}")
        return jsonify({'error': str(e)}), 500

# Проверка здоровья для Render
@app.route('/health')
def health_check():
    return jsonify({'status': 'ok', 'service': 'barber-status-2026'})

# ========== ЗАПУСК ==========

# Инициализация при импорте
init_files()

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 BARBER STATUS 2026 - СЕРВЕР ЗАПУЩЕН")
    print("="*60)
    print(f"📍 Адрес: Республика Дагестан, Дербент, ул. Гагарина, 12")
    print(f"📱 Телефон: +7 963 426-22-33")
    print(f"🔐 Пароль админки: {ADMIN_PASSWORD}")
    print(f"🌍 Порт: {PORT}")
    print("="*60)
    print(f"🌐 Клиентский сайт: http://localhost:{PORT}")
    print(f"🔧 Админ-панель:   http://localhost:{PORT}/admin")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=PORT)