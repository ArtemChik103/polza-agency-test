# Company Data API ETL & PostgreSQL Analytics Pipeline

Проект для извлечения, дедупликации и загрузки данных о компаниях из неструктурированной выгрузки внутреннего API (~1000 записей, 20 JSON-файлов) в СУБД PostgreSQL с автоматическим созданием схемы, индексов и выполнением аналитических SQL-запросов.

---

## 📌 Структура проекта

```
.
├── data_pack.zip        # Исходный архив с выгрузкой API (page_001.json ... page_020.json)
├── schema.sql           # Скрипт создания структуры таблицы и индексов PostgreSQL
├── queries.sql          # 3 аналитических SQL-запроса по заданию
├── load_data.py         # Python-скрипт ETL (парсинг, дедупликация, загрузка, валидация)
├── docker-compose.yml   # Конфигурация PostgreSQL 16 в Docker
├── requirements.txt     # Python-зависимости (psycopg2-binary, python-dotenv)
├── .gitignore           # Исключения для Git
└── README.md            # Инструкция по запуску и описание решения
```

---

## 🛠 Архитектура и Схема БД (`schema.sql`)

### Таблица `companies`

| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | `VARCHAR(32)` | Первичный ключ компании (например, `c_000001`) |
| `name` | `VARCHAR(255)` | Название компании |
| `category` | `VARCHAR(255)` | Категория бизнеса |
| `city` | `VARCHAR(100)` | Город присутствия |
| `address` | `TEXT` | Адрес компании |
| `rating` | `NUMERIC(3, 2)` | Средний рейтинг (может быть `NULL`) |
| `reviews_count` | `INTEGER` | Количество отзывов (по умолчанию `0`) |
| `site` | `TEXT` | URL веб-сайта (может быть `NULL`) |
| `phone` | `VARCHAR(50)` | Номер телефона (может быть `NULL`) |
| `created_at` | `TIMESTAMPTZ` | Время добавления записи в БД |

### 🔍 Дедупликация
В процессе анализа входных данных было выявлено 1000 записей и 994 уникальных `id` (6 дублирующихся строк: `c_000224`, `c_000254`, `c_000263`, `c_000285`, `c_000367`, `c_000453`).
Дедупликация реализована на уровне СУБД с помощью `PRIMARY KEY (id)` и инструкции `ON CONFLICT (id) DO NOTHING`.

### ⚡ Индексы
1. **`idx_companies_category`** — оптимизирует группировку и фильтрацию по категориям (Запросы №1 и №3).
2. **`idx_companies_city_reviews_rating`** — составной индекс для агрегации рейтинга по городам с фильтрацией `reviews_count >= 10` (Запрос №2).
3. **`idx_companies_site`** — частичный индекс (`WHERE site IS NOT NULL`) для быстрой оценки доли компаний с сайтом (Запрос №3).

---

## 📊 Аналитические SQL-запросы (`queries.sql`)

### 1. Топ-5 категорий по числу компаний
```sql
SELECT 
    category AS "Категория",
    COUNT(*) AS "Количество компаний"
FROM companies
GROUP BY category
ORDER BY COUNT(*) DESC, category ASC
LIMIT 5;
```

### 2. Средний рейтинг по городам среди компаний с 10+ отзывами
```sql
SELECT 
    city AS "Город",
    ROUND(AVG(rating), 2) AS "Средний рейтинг",
    COUNT(*) AS "Количество компаний (10+ отзывов)"
FROM companies
WHERE reviews_count >= 10 
  AND rating IS NOT NULL
GROUP BY city
ORDER BY AVG(rating) DESC, city ASC;
```

### 3. Доля компаний с сайтом по категориям
```sql
SELECT 
    category AS "Категория",
    COUNT(*) AS "Всего компаний",
    COUNT(site) AS "Компаний с сайтом",
    ROUND(COUNT(site)::NUMERIC / COUNT(*) * 100, 2) AS "Доля с сайтом (%)"
FROM companies
GROUP BY category
ORDER BY ROUND(COUNT(site)::NUMERIC / COUNT(*) * 100, 2) DESC, category ASC;
```

---

## 🚀 Команда запуска (Quick Start)

### 1. Клонирование репозитория
```bash
git clone https://github.com/ArtemChik103/polza-agency-test.git
cd polza-agency-test
```

### 2. Запуск контейнера PostgreSQL
```bash
docker compose up -d
```

### 3. Запуск ETL-скрипта загрузки и проверки данных
```bash
pip install -r requirements.txt
python load_data.py
```

### 4. Выполнение SQL-запросов вручную в Docker
```bash
docker exec -i company_postgres psql -U postgres -d company_db -f queries.sql
```

---

## ⚙️ Переменные окружения (.env)

При необходимости подключения к внешнему серверу PostgreSQL или Supabase, настройте переменные в `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=company_db
DB_USER=postgres
DB_PASSWORD=postgres
```
