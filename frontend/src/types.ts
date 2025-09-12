export interface Task {
  id: string;
  title: string;
  created_at: string; // из Go придёт ISO-строка
  completed: boolean;
}
