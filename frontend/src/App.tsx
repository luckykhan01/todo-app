import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Task } from "./types";
import { List, Add, Toggle, Delete } from "../wailsjs/go/main/TodoService";

type Filter = "all" | "active" | "done";
type Sort = "newest" | "oldest";
type Priority = "low" | "medium" | "high";

type TaskExt = Task & {
  deadline?: string | null;
  priority?: Priority;
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [error, setError] = useState<string | null>(null);

  // загрузка при старте — избегаем проблемной типизации then(...)
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
    try {
      const deadlineISO = composeDeadlineISO();
      const t = await Add(input, deadlineISO, priority);
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

  async function deleteTask(id: string) {
    try {
      const ok = await Delete(id);
      if (ok) setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  }

  const visible = useMemo(() => {
    let arr = tasks;
    if (filter === "active") arr = arr.filter((t) => !t.completed);
    if (filter === "done") arr = arr.filter((t) => t.completed);
    arr = [...arr].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return arr;
  }, [tasks, filter, sort]);

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addTask();
  }

  function formatDeadline(s?: string | null) {
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
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
        <div className="filters">
          <label>Filter:&nbsp;</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="sort">
          <label>Sort:&nbsp;</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Date (newest)</option>
            <option value="oldest">Date (oldest)</option>
          </select>
        </div>
      </div>

      <ul className="list">
        {visible.map((t) => {
          const tt = t as unknown as TaskExt;
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
                    {tt.priority && (
                      <span className={`prio prio-${tt.priority}`}>
                        {tt.priority}
                      </span>
                    )}
                  </div>
                  <div className="row2">
                    {tt.deadline && (
                      <span className="deadline">⏰ {formatDeadline(tt.deadline)}</span>
                    )}
                    <span className="date">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </label>
              <button className="delete" onClick={() => deleteTask(t.id)}>×</button>
            </li>
          );
        })}
        {visible.length === 0 && <div className="empty">No tasks</div>}
      </ul>
    </div>
  );
}

export default App;
