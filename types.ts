
export interface Task {
  id: string;
  categoryId: string;
  title: string;
  isCompleted: boolean;
  createdAt: number;
  createdByUserId: string;
  assignedToUserId: string;
  expectedDuration?: string; // Kept as optional for backward compatibility if needed, but will be deprecated
  dueAt?: number;
  repeat: 'once' | 'daily';
  lastCompletedDate?: string;
  remindersSentMinutes?: number[];
  auditItems?: string[];
  auditResults?: Array<{
    item: string;
    status: 'pass' | 'fail' | 'pending';
    photoDataUrl?: string;
  }>;
  requiresPhoto?: boolean;
  completionPhotoDataUrl?: string;
  isExpired?: boolean;
  scheduledFor?: number; // Timestamp when task becomes active
  scheduledDate?: string; // YYYY-MM-DD
  reminderStartTime?: string; // HH:mm
  reminderInterval?: number; // Minutes
}


export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind color class like 'bg-blue-500'
  icon: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  phoneNumber?: string;
}

export interface Rental {
  id: string;
  unitNumber: string;
  tenantName: string;
  dueDay: number;
  amount: number;
  isPaid: boolean;
  paidMonth?: string;
  paidByUserId?: string;
  paidAt?: number;
  lastReminderMonth?: string;
  createdAt: number;
  paidAmount?: number; // Total amount paid for current month
  paymentHistory?: Array<{
    date: number;
    amount: number;
    paidByUserId: string;
    note?: string;
  }>;
  balanceReminder?: number; // Timestamp for reminder
}

export interface AssetItem {
  id: string;
  name: string;
  room: string;
  assignedAt: string;
  note: string;
  createdAt: number;
}

export interface AppState {
  categories: Category[];
  tasks: Task[];
}
