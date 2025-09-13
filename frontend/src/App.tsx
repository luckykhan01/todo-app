import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Task } from "./types";
import { List, Add, Toggle, Delete } from "../wailsjs/go/main/TodoService";

type Filter = "all" | "active" | "done";
type Sort = "newest" | "oldest" | "priority" | "deadline";
type Priority = "low" | "medium" | "high";
type DateFilter = "any" | "today" | "week" | "overdue";
type Theme = "light" | "dark";


type TaskExt = Task & {
  deadline?: string | null;
  priority?: Priority;
};

function ConfirmModal({
  open,
  title = "Confirm",
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3 style={{ margin: "0 0 8px 0" }}>{title}</h3>
        <div>{message}</div>
        <div className="actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [error, setError] = useState<string | null>(null);
  // system or saved
  const systemPrefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || (systemPrefersDark ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);


  // модалка удаления
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ts = await List();
      setTasks(ts as unknown as Task[]);
    })();
  }, []);

  function composeDeadlineISO(): string {
    if (!date && !time) return "";
    const t = time || "00:00";
    const local = new Date(`${date}T${t}`);
    if (isNaN(local.getTime())) return "";
    return local.toISOString();
  }

  async function addTask() {
    setError(null);
    const title = input.trim();
    if (!title) {
      setError("Title cannot be empty");
      return;
    }
    try {
      const deadlineISO = composeDeadlineISO();
      const t = await Add(title, deadlineISO, priority);
      setTasks((prev) => [t as unknown as Task, ...prev]);
      setInput("");
      setDate("");
      setTime("");
      setPriority("medium");
    } catch (e: any) {
      setError(e?.message ?? "Adding error");
    }
  }

  async function toggleTask(id: string) {
    try {
      const completed = await Toggle(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    } catch {}
  }

  function requestDelete(id: string) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    try {
      const ok = await Delete(id);
      if (ok) setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  }

  // --- утилиты дат ---
  function startOfLocalDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function isToday(deadline: Date, now: Date) {
    return startOfLocalDay(deadline).getTime() === startOfLocalDay(now).getTime();
  }
  function isWithinWeek(deadline: Date, now: Date) {
    const diffDays = (startOfLocalDay(deadline).getTime() - startOfLocalDay(now).getTime()) / 86400000;
    return diffDays >= 0 && diffDays <= 7;
  }
  function isOverdue(deadline: Date, now: Date) {
    return deadline.getTime() < now.getTime();
  }
  function priorityOrder(p?: Priority) {
    switch (p) {
      case "high": return 3;
      case "medium": return 2;
      case "low": return 1;
      default: return 0;
    }
  }

  const now = new Date();

  // --- фильтрация и сортировка ---
  const visible = useMemo(() => {
    let arr = tasks;

    // статус
    if (filter === "active") arr = arr.filter((t) => !t.completed);
    if (filter === "done") arr = arr.filter((t) => t.completed);

    // по дате
    if (dateFilter !== "any") {
      arr = arr.filter((t) => {
        const tt = t as unknown as TaskExt;
        if (!tt.deadline) return false;
        const d = new Date(tt.deadline);
        if (isNaN(d.getTime())) return false;
        if (dateFilter === "today") return isToday(d, now);
        if (dateFilter === "week") return isWithinWeek(d, now);
        if (dateFilter === "overdue") return isOverdue(d, now) && !t.completed;
        return true;
      });
    }

    // сортировка
    const copy = [...arr];
    copy.sort((a, b) => {
      if (sort === "newest" || sort === "oldest") {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sort === "newest" ? db - da : da - db;
      }
      if (sort === "priority") {
        const pa = priorityOrder((a as any).priority);
        const pb = priorityOrder((b as any).priority);
        return pb - pa; // high -> low
      }
      if (sort === "deadline") {
        const da = new Date((a as any).deadline ?? 0).getTime() || Number.MAX_SAFE_INTEGER;
        const db = new Date((b as any).deadline ?? 0).getTime() || Number.MAX_SAFE_INTEGER;
        return da - db; // ближайший дедлайн выше
      }
      return 0;
    });
    return copy;
  }, [tasks, filter, sort, dateFilter]);

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addTask();
  }

  function formatDeadline(s?: string | null) {
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
  }

  // разбиение на секции (для вида "All")
  const activeItems = visible.filter((t) => !t.completed);
  const doneItems = visible.filter((t) => t.completed);

  // отрисовка элемента
  function renderItem(t: Task) {
    const tt = t as unknown as TaskExt;
    const d = tt.deadline ? new Date(tt.deadline) : null;
    const urgent = !!d && !t.completed && d.getTime() - now.getTime() <= 24 * 3600 * 1000 && d.getTime() >= now.getTime();
    const overdue = !!d && !t.completed && d.getTime() < now.getTime();
    return (
      <li key={t.id} className={t.completed ? "done" : ""}>
        <label className="item">
          <input
            type="checkbox"
            checked={t.completed}
            onChange={() => toggleTask(t.id)}
          />
          <div className="meta">
            <div className="row1">
              <span className="title">{t.title}</span>
              {tt.priority && <span className={`prio prio-${tt.priority}`}>{tt.priority}</span>}
              {urgent && <span className="badge badge-urgent">urgent</span>}
              {overdue && <span className="badge badge-overdue">overdue</span>}
            </div>
            <div className="row2">
              {tt.deadline && <span className="deadline">⏰ {formatDeadline(tt.deadline)}</span>}
              <span className="date">{new Date(t.created_at).toLocaleString()}</span>
            </div>
          </div>
        </label>
        <button className="delete" onClick={() => requestDelete(t.id)}>×</button>
      </li>
    );
  }

  return (
    <div className="container">
      <h1>To-Do List</h1>

      <div className="addRow">
        <input
          placeholder="New Task..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEnter}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          title="Deadline date"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          title="Deadline time"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          title="Priority"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button onClick={addTask}>Add</button>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="toolbar">
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))}>
          {theme === "dark" ? "Light theme" : "Dark theme"}
          </button>
        </div>

        <div className="filters">
          <label>Filter:&nbsp;</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="filters">
          <label>Dates:&nbsp;</label>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
            <option value="any">Any</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="sort">
          <label>Sort:&nbsp;</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Date (newest)</option>
            <option value="oldest">Date (oldest)</option>
            <option value="priority">Priority (high→low)</option>
            <option value="deadline">Deadline (nearest)</option>
          </select>
        </div>
      </div>

      {/* режим All — показываем секциями */}
      {filter === "all" ? (
        <>
          <div className="section">
            <h3>Active</h3>
            <ul className="list">
              {activeItems.map(renderItem)}
              {activeItems.length === 0 && <div className="empty">No active tasks</div>}
            </ul>
          </div>
          <div className="section">
            <h3>Done</h3>
            <ul className="list">
              {doneItems.map(renderItem)}
              {doneItems.length === 0 && <div className="empty">No completed tasks</div>}
            </ul>
          </div>
        </>
      ) : (
        <ul className="list">
          {visible.map(renderItem)}
          {visible.length === 0 && <div className="empty">No tasks</div>}
        </ul>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Delete task?"
        message="This action cannot be undone."
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default App;
