package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type Task struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	Completed bool      `json:"completed"`
}

type storage struct {
	path string
}

func newStorage(appName string) (*storage, error) {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		home, _ := os.UserHomeDir()
		dir = filepath.Join(home, "."+appName)
	} else {
		dir = filepath.Join(dir, appName)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &storage{path: filepath.Join(dir, "tasks.json")}, nil
}

func (s *storage) Load() ([]Task, error) {
	b, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return []Task{}, nil
		}
		return nil, err
	}
	if len(b) == 0 {
		return []Task{}, nil
	}
	var tasks []Task
	if err := json.Unmarshal(b, &tasks); err != nil {
		return nil, err
	}
	return tasks, nil
}

func (s *storage) Save(tasks []Task) error {
	// чтобы файл всегда был валидным
	tmp := s.path + ".tmp"
	b, err := json.MarshalIndent(tasks, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func genID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// сервис который мы зальем во фронтенд
type TodoService struct {
	ctx     context.Context
	storage *storage
	tasks   []Task
}

func NewTodoService() (*TodoService, error) {
	st, err := newStorage("WailsTodo")
	if err != nil {
		return nil, err
	}
	ts := &TodoService{storage: st, tasks: []Task{}}
	// загрузим состояние при старте
	if loaded, err := st.Load(); err == nil {
		ts.tasks = loaded
		// гарантируем сортировку по дате добавления (самые новые сверху)
		sort.Slice(ts.tasks, func(i, j int) bool {
			return ts.tasks[i].CreatedAt.After(ts.tasks[j].CreatedAt)
		})
	}
	return ts, nil
}

func (t *TodoService) startup(ctx context.Context) { t.ctx = ctx }

// возвращает все задачи (фронт уже сам отфильтрует/отсортирует при необходимости)
func (t *TodoService) List() []Task { return t.tasks }

// добавляет задачу, валидация на пустой ввод
func (t *TodoService) Add(title string) (Task, error) {
	if strings.TrimSpace(title) == "" {
		return Task{}, errors.New("title cannot be empty")
	}
	task := Task{
		ID:        genID(),
		Title:     strings.TrimSpace(title),
		CreatedAt: time.Now(),
		Completed: false,
	}
	t.tasks = append([]Task{task}, t.tasks...) // добавляем в начало
	_ = t.storage.Save(t.tasks)
	return task, nil
}

// отмечает выполненность
func (t *TodoService) Toggle(id string) (bool, error) {
	for i := range t.tasks {
		if t.tasks[i].ID == id {
			t.tasks[i].Completed = !t.tasks[i].Completed
			_ = t.storage.Save(t.tasks)
			return t.tasks[i].Completed, nil
		}
	}
	return false, errors.New("task not found")
}

func (t *TodoService) Delete(id string) (bool, error) {
	for i := range t.tasks {
		if t.tasks[i].ID == id {
			t.tasks = append(t.tasks[:i], t.tasks[i+1:]...)
			_ = t.storage.Save(t.tasks)
			return true, nil
		}
	}
	return false, errors.New("task not found")
}
