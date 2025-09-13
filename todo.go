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

// adding Priority function
type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

func normalizePriority(p string) Priority {
	switch strings.ToLower(strings.TrimSpace(p)) {
	case string(PriorityLow):
		return PriorityLow
	case string(PriorityHigh):
		return PriorityHigh
	default:
		return PriorityMedium // po defaultu
	}
}

type Task struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	Completed bool      `json:"completed"`
	// new parts:
	Deadline *time.Time `json:"deadline,omitempty"`
	Priority Priority   `json:"priority"`
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
	if loaded, err := st.Load(); err == nil {
		ts.tasks = loaded
		sort.Slice(ts.tasks, func(i, j int) bool {
			return ts.tasks[i].CreatedAt.After(ts.tasks[j].CreatedAt)
		})
	}
	return ts, nil
}

func (t *TodoService) startup(ctx context.Context) { t.ctx = ctx }

func (t *TodoService) List() []Task { return t.tasks }

// теперь принимает дедлайн и приоритет
func (t *TodoService) Add(title string, deadlineISO string, priority string) (Task, error) {
	if strings.TrimSpace(title) == "" {
		return Task{}, errors.New("title cannot be empty")
	}

	var dl *time.Time
	if strings.TrimSpace(deadlineISO) != "" {
		// пробуем несколько форматов на всякий случай
		var parsed time.Time
		var err error
		formats := []string{
			time.RFC3339,       // 2025-09-12T15:04:05Z07:00
			"2006-01-02T15:04", // локальная без зоны
			"2006-01-02 15:04", // с пробелом
			"2006-01-02",       // только дата
		}
		for _, f := range formats {
			if p, e := time.Parse(f, deadlineISO); e == nil {
				parsed = p
				err = nil
				break
			} else {
				err = e
			}
		}
		if err != nil {
			return Task{}, errors.New("invalid deadline format (use RFC3339 or YYYY-MM-DD[THH:MM])")
		}
		dl = &parsed
	}

	task := Task{
		ID:        genID(),
		Title:     strings.TrimSpace(title),
		CreatedAt: time.Now(),
		Completed: false,
		Deadline:  dl,
		Priority:  normalizePriority(priority),
	}
	t.tasks = append([]Task{task}, t.tasks...)
	_ = t.storage.Save(t.tasks)
	return task, nil
}

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
