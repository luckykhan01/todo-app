import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Task } from "./types";

// wails bindings
import { List, Add, Toggle, Delete } from "../wailsjs/go/main/TodoService";

type Filter = "all" | "active" | "done";
type Sort = "newest" | "oldest";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [error, setError] = useState<string | null>(null);

  // загрузка при старте
  useEffect(() => {
    List().then((ts: Task[]) => setTasks(ts));
  }, []);

  async function addTask() {
    setError(null);
    try {
      const t = await Add(input);
      setTasks((prev) => [t, ...prev]);
      setInput("");
    } catch (e: any) {
      setError(e?.message ?? "Adding error");
    }
  }

  async function toggleTask(id: string) {
    try {
      const completed = await Toggle(id);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed } : t))
      );
    } catch {
    }
  }

  async function deleteTask(id: string) {
    try {
      const ok = await Delete(id);
      if (ok) setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // no-op
    }
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
        {visible.map((t) => (
          <li key={t.id} className={t.completed ? "done" : ""}>
            <label className="item">
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => toggleTask(t.id)}
              />
              <span className="title">{t.title}</span>
              <span className="date">
                {new Date(t.created_at).toLocaleString()}
              </span>
            </label>
            <button className="delete" onClick={() => deleteTask(t.id)}>×</button>
          </li>
        ))}
        {visible.length === 0 && <div className="empty">No tasks</div>}
      </ul>
    </div>
  );
}

export default App;
