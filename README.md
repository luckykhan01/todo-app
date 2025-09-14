# README

## About

Desktop приложение «To-Do List» на **Go + Wails v2 + React (TypeScript)**.  
- Дедлайны (дата и время)
- Приоритеты (низкий / средний / высокий)
- Фильтры и сортировки:
    по статусу: все / активные / выполненные
    по дате: сегодня / на неделю / просроченные
    сортировка: по дате, по приоритету, по дедлайну
- Светлая / тёмная тема
- Подтверждение удаления (модальное окно) 
- Состояние по умолчанию хранится локально в JSON.

## Video Link
https://drive.google.com/file/d/1wnw2GTZTzliOjCAwZmdUCW1nkcTFOoTz/view?usp=share_link

## CV
https://drive.google.com/file/d/10rCVrM_2hSR-Yevfw8GCxa5nn9smy0F8/view?usp=share_link

## Building

To build a redistributable, production mode package, use `wails build`.

## Checklist

Checklist для поэтапного выполнения задания:
### 1) Интерфейс пользователя (25/25 баллов)
Основная часть (15 баллов):
1. Интерфейс с текстовым полем для ввода новой задачи. 
2. Кнопку для добавления задачи в список.
3. Список всех задач на экране.
4. CSS для стилизации интерфейса.
5. Значки или цвета для обозначения выполненных и невыполненных задач.

Бонусная часть (10 баллов):
1. Адаптивная верстка (чтобы корректно смотрелось при изменении размера окна).
2. Возможность переключения светлой/тёмной темы.

### 2) Добавление задач (20/20 баллов)
Основная часть (10 баллов):
1. Функционал добавления новой задачи в список.
2. Валидация ввода (проверка на пустой ввод).

Бонусная часть (10 баллов):
1. Задачи с датой и временем выполнения.
2. Приоритеты задачи (низкий, средний, высокий).

### 3) Удаление задач (15/15 баллов)
Основная часть (5 баллов):
1. Удаление задач из списка.

Бонусная часть (10 баллов):
1. Подтверждение удаления задачи (модальное окно).

### 4) Управление выполнением задач (30/30 баллов)
Основная часть (10 баллов):
1. Отметка задачи как выполненной.
2. Зачеркивание текста выполненных задач.

Бонусная часть (20 баллов):
1. Перемещение выполненных задач в отдельный раздел «Выполненные задачи».
2. Отмена отметки выполнения задачи (возврат в «Активные задачи»).

### 5) Сохранение состояния (20/50 баллов)
Основная часть (20 баллов):
1. Сохранение состояния задач при закрытии приложения.
2. Загрузка состояния задач при запуске приложения.

### 6) Фильтрация и сортировка задач (20/20 баллов)
Основная часть (10 баллов):
1. Фильтрация задач по статусу (все / активные / выполненные).
2. Сортировка по дате добавления.

Бонусная часть (10 баллов):
1. Сортировка по приоритету.
2. Фильтрация по дате (сегодня / на неделю / просроченные).

## Prerequisites

Before running the application, ensure you have the following installed:

- [Go](https://golang.org/doc/install) (version **1.23**)
- [Node.js](https://nodejs.org/) (version **22.15.0**)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

> Tip: After installing, run `wails doctor` to verify your environment.

## Getting Started

Follow these steps to set up and run the application:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/luckykhan01/todo-app.git
   cd todo_app
   ```

2. **Install Dependencies**:

   - Install Go dependencies:

     ```bash
     go mod tidy
     ```

   - Install frontend dependencies:

     ```bash
     cd frontend
     npm install
     cd ..
     ```

   - Install Wails CLI 
     ```bash
     go install github.com/wailsapp/wails/v2/cmd/wails@latest
     ```

3. **Run in Development Mode**:

   Start the application in live development mode:

   ```bash
   wails dev
   ```

   This command runs a Vite development server, enabling hot reload for frontend changes. You can also access the development server in a browser at `http://localhost:34115` to interact with Go methods via devtools.

4. **Build for Production**:

   To create a production build of the application:

   ```bash
   wails build
   ```

   The build output will be located in the `build/bin` directory.

## Project Structure

- **`/frontend`**: UI на React
  - `src/App.tsx`: основной интерфейс — ввод/добавление задач, отметка выполнения/снятие, удаление (модальное подтверждение), фильтры (статус/даты), сортировки (дата/приоритет/дедлайн), переключатель светлая/тёмная тема, вывод дедлайна и приоритета.
  - `src/App.css`: стили приложения, CSS-переменные темы, бейджи приоритета, метки
  - `src/types.ts`: типы данных фронтенда (Task, Priority и др.)
  - `JSON`: tasks.json
- **`main.go`**: запуск Wails-приложения, инициализация и привязка сервисов к фронту
- **`todo.go`**: доменный сервис TodoService и локальное хранилище
  - `methods`: List, Add, Toggle, Delete
  - `task fields`: deadline, priority, created_at, completed
  - `deadline parsing`: (RFC3339 / YYYY-MM-DD[THH:MM])
  - `JSON`: tasks.json

