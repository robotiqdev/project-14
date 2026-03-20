export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
