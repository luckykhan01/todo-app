export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  created_at: string;
  completed: boolean;
  deadline?: string | null; 
  priority: Priority;
}
