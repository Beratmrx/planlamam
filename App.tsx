
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, Category, User, Rental, AssetItem } from './types';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from './constants';
import { PlusIcon, TrashIcon, SparklesIcon, CheckIcon } from './components/Icons';
import { initializeWhatsApp, getWhatsAppStatus, sendWhatsAppMessage, logoutWhatsApp } from './services/whatsappService';

const ENV_BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
const inferredHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const INFERRED_BACKEND_URL = `http://${inferredHost}:3002`;
const isLocalEnvUrl = Boolean(ENV_BACKEND_URL && /localhost|127\.0\.0\.1/i.test(ENV_BACKEND_URL));
// Docker container'ında çalışıyorsa (VITE_BACKEND_URL backend içeriyorsa), Nginx reverse proxy kullan (/api)
const isDockerEnv = Boolean(ENV_BACKEND_URL && ENV_BACKEND_URL.includes('backend'));
// Netlify proxy: VITE_BACKEND_URL = site URL (https://etkegym.com) ise aynı origin kullan, istekler /api üzerinden proxy edilir
const isSameOriginProxy = typeof window !== 'undefined' && ENV_BACKEND_URL && (window.location.origin === ENV_BACKEND_URL.replace(/\/$/, ''));
// Eğer env localhost ise ve siteyi IP ile açıyorsak (telefon vb.), backend URL'i otomatik IP:3002 olur.
const BACKEND_URL = isDockerEnv || isSameOriginProxy ? '' : (!ENV_BACKEND_URL || isLocalEnvUrl ? INFERRED_BACKEND_URL : ENV_BACKEND_URL);

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<'active' | 'completed' | 'expired'>('active');
  const [isHydrated, setIsHydrated] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'home' | 'tasks' | 'rentals' | 'assets'>('home');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);

  // UI States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedTaskCategoryId, setSelectedTaskCategoryId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICONS[0]);
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskExpectedDuration, setNewTaskExpectedDuration] = useState('01:00');
  const [newTaskRepeat, setNewTaskRepeat] = useState<'once' | 'daily'>('once');
  const [auditOptions, setAuditOptions] = useState<string[]>([]);
  const [selectedAuditOptions, setSelectedAuditOptions] = useState<string[]>([]);
  const [newAuditOption, setNewAuditOption] = useState('');
  const [newTaskRequiresPhoto, setNewTaskRequiresPhoto] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [activeAuditTaskId, setActiveAuditTaskId] = useState<string | null>(null);
  const [auditStepIndex, setAuditStepIndex] = useState(0);
  const [auditPhotoDataUrl, setAuditPhotoDataUrl] = useState<string | null>(null);
  const [isAuditReviewOpen, setIsAuditReviewOpen] = useState(false);
  const [activeAuditReviewTaskId, setActiveAuditReviewTaskId] = useState<string | null>(null);
  const [isCompletionPhotoModalOpen, setIsCompletionPhotoModalOpen] = useState(false);
  const [activeCompletionPhotoTaskId, setActiveCompletionPhotoTaskId] = useState<string | null>(null);
  const [completionPhotoDataUrl, setCompletionPhotoDataUrl] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [newRentalUnit, setNewRentalUnit] = useState('');
  const [newRentalName, setNewRentalName] = useState('');
  const [newRentalDueDay, setNewRentalDueDay] = useState('1');
  const [newRentalAmount, setNewRentalAmount] = useState('');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetRoom, setNewAssetRoom] = useState('');
  const [newAssetDate, setNewAssetDate] = useState('');
  const [newAssetNote, setNewAssetNote] = useState('');
  const [assetFilterRoom, setAssetFilterRoom] = useState('');
  const [assetFilterText, setAssetFilterText] = useState('');
  const [homeFilterStatus, setHomeFilterStatus] = useState<'active' | 'completed' | 'expired' | 'all'>('active');
  const [homeFilterCategory, setHomeFilterCategory] = useState('all');
  const [homeFilterText, setHomeFilterText] = useState('');
  const [tasksAllFilterCategory, setTasksAllFilterCategory] = useState('all');
  const [tasksAllFilterText, setTasksAllFilterText] = useState('');

  // Daily Report States
  const [homeView, setHomeView] = useState<'tasks' | 'report'>('tasks');
  const [reportFilterUser, setReportFilterUser] = useState('all');
  const [reportFilterStatus, setReportFilterStatus] = useState('all');
  const [reportFilterDate, setReportFilterDate] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // WhatsApp States
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppReady, setWhatsAppReady] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('05536789487');
  const [secondPhoneNumber, setSecondPhoneNumber] = useState('');
  const [whatsAppInitRequested, setWhatsAppInitRequested] = useState(false);

  // Success Notification State
  const [successNotification, setSuccessNotification] = useState<{
    show: boolean;
    message: string;
    icon: string;
  }>({ show: false, message: '', icon: '' });

  const saveTimerRef = useRef<number | null>(null);
  const lastStorageSyncRef = useRef(0);
  const defaultPhoneNumber = '05536789487';
  const defaultAdmin: User = {
    id: 'user-admin',
    name: 'Admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    phoneNumber: defaultPhoneNumber
  };

  const normalizeUsers = (inputUsers: User[]) => {
    const baseUsers = inputUsers.length ? inputUsers : [defaultAdmin];
    return baseUsers.map(user => {
      const username = user.username || user.name.toLowerCase().replace(/\s+/g, '');
      let password = user.password || '1234';
      if (user.role === 'admin') {
        password = user.password && user.password !== '1234' ? user.password : 'admin123';
      }
      return {
        ...user,
        username: user.role === 'admin' ? 'admin' : username,
        password
      };
    });
  };

  const getSessionUserId = () => {
    try {
      return localStorage.getItem('planla_session_user_id');
    } catch {
      return null;
    }
  };

  const resolveCurrentUserId = (usersList: User[], desiredId?: string | null) => {
    if (!desiredId) return null;
    if (usersList.some(u => u.id === desiredId)) return desiredId;
    return null;
  };

  const normalizeTasks = (taskList: Task[], fallbackUserId: string) => {
    return taskList.map(task => ({
      ...task,
      createdByUserId: task.createdByUserId || fallbackUserId,
      assignedToUserId: task.assignedToUserId || fallbackUserId,
      expectedDuration: task.expectedDuration || '01:00',
      expectedDurationMinutes: task.expectedDurationMinutes,
      dueAt: task.dueAt,
      repeat: task.repeat || 'once',
      lastCompletedDate: task.lastCompletedDate,
      remindersSentMinutes: task.remindersSentMinutes || [],
      auditItems: task.auditItems || [],
      auditResults: task.auditResults || [],
      requiresPhoto: task.requiresPhoto ?? false,
      completionPhotoDataUrl: task.completionPhotoDataUrl,
      isExpired: task.isExpired || false
    }));
  };

  const buildLocalData = () => {
    const savedUsers = localStorage.getItem('planla_users_v1');
    const savedCategories = localStorage.getItem('planla_categories_v3');
    const savedTasks = localStorage.getItem('planla_tasks_v3');
    const savedWhatsAppEnabled = localStorage.getItem('planla_whatsapp_enabled');
    const savedPhoneNumber = localStorage.getItem('planla_phone_number');
    const savedSecondPhoneNumber = localStorage.getItem('planla_phone_number_2');
    const savedAuditOptions = localStorage.getItem('planla_audit_options_v1');
    const savedRentals = localStorage.getItem('planla_rentals_v1');
    const savedAssets = localStorage.getItem('planla_assets_v1');

    let initialUsers: User[] = [];
    if (savedUsers) {
      try {
        initialUsers = JSON.parse(savedUsers);
      } catch {
        initialUsers = [defaultAdmin];
      }
    } else {
      initialUsers = [defaultAdmin];
    }

    const normalizedUsers = normalizeUsers(initialUsers);
    // ✅ Session: oturum açıkken yenilemede login isteme
    const currentUserId = resolveCurrentUserId(normalizedUsers, getSessionUserId());
    const fallbackUserId = normalizedUsers[0]?.id || 'user-admin';
    const categories = savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES;
    const activeCategoryId = categories.length ? categories[0].id : null;
    const tasks = savedTasks ? normalizeTasks(JSON.parse(savedTasks), fallbackUserId) : [];
    const whatsAppEnabled = savedWhatsAppEnabled ? JSON.parse(savedWhatsAppEnabled) : false;
    const phoneNumber = savedPhoneNumber || defaultPhoneNumber;
    const secondPhoneNumber = savedSecondPhoneNumber || '';
    const auditOptions = savedAuditOptions ? JSON.parse(savedAuditOptions) : [];
    const rentals = savedRentals ? JSON.parse(savedRentals) : [];
    const assets = savedAssets ? JSON.parse(savedAssets) : [];

    return {
      users: normalizedUsers,
      currentUserId,
      categories,
      activeCategoryId,
      tasks,
      whatsAppEnabled,
      phoneNumber,
      secondPhoneNumber,
      auditOptions: Array.isArray(auditOptions) ? auditOptions : [],
      rentals: Array.isArray(rentals) ? rentals : [],
      assets: Array.isArray(assets) ? assets : [],
      activeSection: 'home'
    };
  };

  const applyHydratedState = (data: any, isBackgroundSync = false) => {
    const normalizedUsers = normalizeUsers(Array.isArray(data?.users) ? data.users : []);
    // ✅ Session: oturum açıkken yenilemede login isteme
    const currentUserId = resolveCurrentUserId(normalizedUsers, getSessionUserId());
    const fallbackUserId = normalizedUsers[0]?.id || 'user-admin';
    const categories = Array.isArray(data?.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES;
    const localActiveCategoryId = localStorage.getItem('planla_active_category_id');
    const desiredCategoryId = localActiveCategoryId || data?.activeCategoryId;
    const activeCategoryId = desiredCategoryId && categories.some((c: Category) => c.id === desiredCategoryId)
      ? desiredCategoryId
      : categories[0]?.id || null;
    const localActiveSection = localStorage.getItem('planla_active_section');

    setUsers(normalizedUsers);
    setCurrentUserId(currentUserId);
    if (!isBackgroundSync) {
      setNewTaskAssigneeId(currentUserId || '');
    }
    setIsAuthModalOpen(!currentUserId);
    setCategories(categories);
    setActiveCategoryId(activeCategoryId);
    setTasks(normalizeTasks(Array.isArray(data?.tasks) ? data.tasks : [], fallbackUserId));
    setWhatsAppEnabled(Boolean(data?.whatsAppEnabled));
    setPhoneNumber(data?.phoneNumber || defaultPhoneNumber);
    setSecondPhoneNumber(data?.secondPhoneNumber || '');
    setAuditOptions(Array.isArray(data?.auditOptions) ? data.auditOptions : []);
    setRentals(Array.isArray(data?.rentals) ? data.rentals : []);
    setAssets(Array.isArray(data?.assets) ? data.assets : []);

    // FIX: Don't reset active section during background sync to avoid interrupting user
    if (!isBackgroundSync) {
      const resolvedSection = ['home', 'tasks', 'rentals', 'assets'].includes(localActiveSection || data?.activeSection)
        ? (localActiveSection || data?.activeSection)
        : 'home';
      setActiveSection(resolvedSection);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let serverData: any = null;
      try {
        const response = await fetch(`${BACKEND_URL}/api/storage`);
        if (response.ok) {
          serverData = await response.json();
        }
      } catch (error) {
        console.error('Storage okuma hatası:', error);
      }

      const hasServerData = serverData && (
        Array.isArray(serverData.users) ||
        Array.isArray(serverData.categories) ||
        Array.isArray(serverData.tasks) ||
        Array.isArray(serverData.rentals) ||
        Array.isArray(serverData.assets)
      );

      const fallbackData = buildLocalData();
      if (!cancelled) {
        applyHydratedState(hasServerData ? serverData : fallbackData);
        if (hasServerData && serverData?.savedAt) {
          lastStorageSyncRef.current = serverData.savedAt;
        }
        setIsHydrated(true);
      }

      if (!hasServerData) {
        try {
          const storagePayload = {
            users: fallbackData.users,
            categories: fallbackData.categories,
            tasks: fallbackData.tasks,
            whatsAppEnabled: fallbackData.whatsAppEnabled,
            phoneNumber: fallbackData.phoneNumber,
            secondPhoneNumber: fallbackData.secondPhoneNumber,
            auditOptions: fallbackData.auditOptions,
            rentals: fallbackData.rentals,
            assets: fallbackData.assets
          };
          await fetch(`${BACKEND_URL}/api/storage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storagePayload)
          });
          lastStorageSyncRef.current = Date.now();
        } catch (error) {
          console.error('Storage ilk yazma hatası:', error);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/storage`);
        if (!response.ok) return;
        const data = await response.json();
        if (data?.savedAt && data.savedAt > lastStorageSyncRef.current) {
          lastStorageSyncRef.current = data.savedAt;
          applyHydratedState(data, true); // true = isBackgroundSync
        }
      } catch (error) {
        console.error('Storage senkron hatası:', error);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    // 🔒 Güvenlik: kullanıcı id'sini localStorage'da tutma (yenilemede otomatik login olmasın)
  }, [currentUserId, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (activeCategoryId) {
      localStorage.setItem('planla_active_category_id', activeCategoryId);
    }
    localStorage.setItem('planla_active_section', activeSection);
  }, [activeCategoryId, activeSection, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(async () => {
      const payload = {
        users,
        categories,
        tasks,
        whatsAppEnabled,
        phoneNumber,
        secondPhoneNumber,
        auditOptions,
        rentals,
        assets
      };
      try {
        await fetch(`${BACKEND_URL}/api/storage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        lastStorageSyncRef.current = Date.now();
      } catch (error) {
        console.error('Storage kaydetme hatası:', error);
      }
    }, 500);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    users,
    currentUserId,
    categories,
    activeCategoryId,
    tasks,
    whatsAppEnabled,
    phoneNumber,
    secondPhoneNumber,
    auditOptions,
    rentals,
    assets,
    activeSection,
    isHydrated
  ]);

  useEffect(() => {
    if (currentUserId) {
      setNewTaskAssigneeId(currentUserId);
    }
  }, [currentUserId]);


  useEffect(() => {
    if (!isHydrated || categories.length === 0) return;
    const hasAudit = categories.some(cat => cat.name === 'Denetim');
    if (!hasAudit) {
      setCategories(prev => [
        ...prev,
        { id: `cat-denetim-${Date.now()}`, name: 'Denetim', color: 'bg-sky-500', icon: '🧾' }
      ]);
    }
  }, [categories, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTasks(prev => {
        let changed = false;
        const updated = prev.map(task => {
          if (task.isCompleted || task.isExpired) return task;
          if (!task.dueAt) return task;
          if (task.dueAt <= now) {
            changed = true;
            return { ...task, isExpired: true };
          }
          return task;
        });
        return changed ? updated : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!whatsAppEnabled && !whatsAppReady) return;
    if (tasks.length === 0) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      setTasks(prev => {
        let changed = false;
        const updated = prev.map(task => {
          if (task.isCompleted) return task;
          if (!task.dueAt || !task.expectedDurationMinutes) return task;

          const remainingMs = task.dueAt - currentTime;
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          const thresholds = getReminderThresholds(task.expectedDurationMinutes);
          const alreadySent = task.remindersSentMinutes || [];

          const shouldSend = thresholds.find(min => min >= 0 && remainingMinutes <= min && !alreadySent.includes(min));
          if (!shouldSend) return task;

          const assignee = users.find(u => u.id === task.assignedToUserId);
          if (assignee?.phoneNumber) {
            const message = `⏳ Görev süresi yaklaşıyor!\n\n📝 ${task.title}\n📌 Kalan süre: ${shouldSend} dk\n\nLütfen tamamlayın.`;
            sendWhatsAppMessage(assignee.phoneNumber, message).catch(error => {
              console.error('WhatsApp hatırlatma hatası:', error);
            });
          }

          changed = true;
          return {
            ...task,
            remindersSentMinutes: [...alreadySent, shouldSend]
          };
        });
        return changed ? updated : prev;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [tasks, users, whatsAppEnabled, whatsAppReady]);

  useEffect(() => {
    const normalizeDailyTasks = () => {
      const today = new Date().toISOString().slice(0, 10);
      setTasks(prev => {
        let changed = false;
        const updated = prev.map(task => {
          if (task.repeat === 'daily' && task.isCompleted && task.lastCompletedDate !== today) {
            changed = true;
            const durationMinutes = task.expectedDurationMinutes || parseDurationMinutes(task.expectedDuration);
            const dueAt = durationMinutes > 0 ? Date.now() + durationMinutes * 60 * 1000 : task.dueAt;
            return {
              ...task,
              isCompleted: false,
              dueAt,
              remindersSentMinutes: [],
              completionPhotoDataUrl: undefined
            };
          }
          return task;
        });
        return changed ? updated : prev;
      });
    };

    normalizeDailyTasks();
    const interval = setInterval(normalizeDailyTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!rentals.length) return;
    const checkRentals = async () => {
      const now = new Date();
      const monthKey = getMonthKey(now);
      const year = now.getFullYear();
      const monthIndex = now.getMonth();
      const reminders: Rental[] = [];

      setRentals(prev => {
        let changed = false;
        const updated = prev.map(rental => {
          const isPaidForMonth = rental.paidMonth === monthKey;
          const dueDate = getDueDateForMonth(year, monthIndex, rental.dueDay);
          const overdueAt = dueDate.getTime() + 3 * 24 * 60 * 60 * 1000;
          const shouldRemind = !isPaidForMonth && now.getTime() >= overdueAt && rental.lastReminderMonth !== monthKey;
          if (shouldRemind) {
            reminders.push(rental);
          }
          if (rental.isPaid !== isPaidForMonth || shouldRemind) {
            changed = true;
            return {
              ...rental,
              isPaid: isPaidForMonth,
              lastReminderMonth: shouldRemind ? monthKey : rental.lastReminderMonth
            };
          }
          return rental;
        });
        return changed ? updated : prev;
      });

      if (!(whatsAppEnabled || whatsAppReady)) return;

      for (const rental of reminders) {
        const message = `⚠️ ${rental.unitNumber} dairesi (${rental.tenantName}) kirası 3 gündür gecikmede.`;
        try {
          await sendNotificationMessage(message);
        } catch (error) {
          console.error('WhatsApp kira hatası:', error);
        }
      }
    };

    checkRentals();
    const interval = setInterval(checkRentals, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [rentals, whatsAppEnabled, whatsAppReady, phoneNumber, secondPhoneNumber]);

  // WhatsApp durumunu periyodik kontrol et
  useEffect(() => {
    if (!whatsAppEnabled) return;

    const checkStatus = async () => {
      const status = await getWhatsAppStatus();
      setWhatsAppReady(status.ready);
      setQrCode(status.qrCode);

      // Backend restart / crash durumunda (hasClient:false) yeniden başlatmayı tekrar denemeliyiz.
      // ANCAK: Sadece kullanıcı manuel olarak "WhatsApp Aç" butonuna bastıysa (whatsAppEnabled: true)
      if (!status.hasClient && whatsAppEnabled) {
        setWhatsAppInitRequested(false);
      }

      // Otomatik yeniden başlatma: Sadece whatsAppEnabled TRUE ve henüz initialize edilmemişse
      if (!status.hasClient && !whatsAppInitRequested && whatsAppEnabled) {
        console.log('🔄 WhatsApp client yok, otomatik başlatılıyor...');
        const result = await initializeWhatsApp();
        if (!result.success) {
          console.error('WhatsApp başlatma hatası:', result.message);
          return;
        }
        setWhatsAppInitRequested(true);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [whatsAppEnabled, whatsAppInitRequested]);

  useEffect(() => {
    if (!whatsAppEnabled) {
      setWhatsAppInitRequested(false);
    }
  }, [whatsAppEnabled]);

  const getMonthKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const getDueDateForMonth = (year: number, monthIndex: number, dueDay: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const clampedDay = Math.min(Math.max(1, dueDay), lastDay);
    return new Date(year, monthIndex, clampedDay, 9, 0, 0, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) return isoDate;
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  };

  const getNotificationNumbers = () => {
    const primary = phoneNumber.trim();
    const secondary = secondPhoneNumber.trim();
    return Array.from(new Set([primary, secondary].filter(Boolean)));
  };

  const sendNotificationMessage = async (message: string) => {
    const targets = getNotificationNumbers();
    if (!targets.length) return;
    for (const target of targets) {
      await sendWhatsAppMessage(target, message);
    }
  };

  const activeCategory = useMemo(() => categories.find(c => c.id === activeCategoryId), [categories, activeCategoryId]);
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId) || null, [users, currentUserId]);
  const isAdmin = currentUser?.role === 'admin';
  const isAuditCategory = activeCategory?.name === 'Denetim';
  const visibleByUser = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return tasks;
    return tasks.filter(task => task.createdByUserId === currentUser.id || task.assignedToUserId === currentUser.id);
  }, [tasks, currentUser]);
  const activeTasks = useMemo(
    () => visibleByUser.filter(t => t.categoryId === activeCategoryId && !t.isExpired && (t.repeat === 'daily' || !t.isCompleted)),
    [visibleByUser, activeCategoryId]
  );
  const completedTasks = useMemo(
    () => visibleByUser.filter(t => t.categoryId === activeCategoryId && t.repeat === 'once' && t.isCompleted),
    [visibleByUser, activeCategoryId]
  );
  const expiredTasks = useMemo(
    () => visibleByUser.filter(t => t.categoryId === activeCategoryId && t.isExpired),
    [visibleByUser, activeCategoryId]
  );
  const visibleTasks = taskView === 'active' ? activeTasks : taskView === 'completed' ? completedTasks : expiredTasks;
  const tasksAllFiltered = useMemo(() => {
    let list = visibleByUser;
    if (taskView === 'active') {
      list = list.filter(t => !t.isExpired && (t.repeat === 'daily' || !t.isCompleted));
    } else if (taskView === 'completed') {
      list = list.filter(t => t.repeat === 'once' && t.isCompleted);
    } else {
      list = list.filter(t => t.isExpired);
    }

    if (tasksAllFilterCategory !== 'all') {
      list = list.filter(t => t.categoryId === tasksAllFilterCategory);
    }

    const q = tasksAllFilterText.trim().toLowerCase();
    if (q) {
      list = list.filter(t => (t.title || '').toLowerCase().includes(q));
    }

    return list;
  }, [visibleByUser, taskView, tasksAllFilterCategory, tasksAllFilterText]);
  const currentMonthKey = useMemo(() => getMonthKey(new Date(nowTs)), [nowTs]);
  const rentalsWithStatus = useMemo(() => {
    const nowDate = new Date(nowTs);
    const year = nowDate.getFullYear();
    const monthIndex = nowDate.getMonth();
    return rentals.map(rental => {
      const dueDate = getDueDateForMonth(year, monthIndex, rental.dueDay);
      const isPaidForMonth = rental.paidMonth === currentMonthKey;
      const overdueDays = !isPaidForMonth && nowTs > dueDate.getTime()
        ? Math.floor((nowTs - dueDate.getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      return { ...rental, isPaidForMonth, overdueDays, dueDate };
    });
  }, [rentals, nowTs, currentMonthKey]);
  const filteredAssets = useMemo(() => {
    const roomFilter = assetFilterRoom.trim().toLowerCase();
    const textFilter = assetFilterText.trim().toLowerCase();
    return assets.filter(item => {
      const roomMatch = roomFilter ? item.room.toLowerCase().includes(roomFilter) : true;
      const textMatch = textFilter
        ? `${item.name} ${item.note}`.toLowerCase().includes(textFilter)
        : true;
      return roomMatch && textMatch;
    });
  }, [assets, assetFilterRoom, assetFilterText]);
  const homeTasks = useMemo(() => {
    let list = visibleByUser;
    if (homeFilterStatus !== 'all') {
      if (homeFilterStatus === 'active') {
        list = list.filter(t => !t.isCompleted && !t.isExpired);
      } else if (homeFilterStatus === 'completed') {
        list = list.filter(t => t.isCompleted);
      } else if (homeFilterStatus === 'expired') {
        list = list.filter(t => t.isExpired);
      }
    }
    if (homeFilterCategory !== 'all') {
      list = list.filter(t => t.categoryId === homeFilterCategory);
    }
    if (homeFilterText.trim()) {
      const q = homeFilterText.trim().toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [visibleByUser, homeFilterStatus, homeFilterCategory, homeFilterText]);

  // Daily Report Calculation
  const dailyReport = useMemo(() => {
    // Helper to check dates
    const checkDate = (dateTs: number, filter: 'today' | 'week' | 'month' | 'all') => {
      if (filter === 'all') return true;
      const date = new Date(dateTs);
      const now = new Date();

      if (filter === 'today') {
        return date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();
      }

      if (filter === 'week') {
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round(Math.abs((now.getTime() - date.getTime()) / oneDay));
        return diffDays <= 7;
      }

      if (filter === 'month') {
        return date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();
      }

      return true;
    };

    // Filter users if needed
    const reportUsers = reportFilterUser === 'all'
      ? users
      : users.filter(u => u.id === reportFilterUser);

    return reportUsers.map(user => {
      // Get all tasks relevant to this user (assigned to or created by)
      // For report, we mostly care about tasks ASSIGNED to the user
      const userTasks = tasks.filter(t => t.assignedToUserId === user.id);

      // Apply date filter
      const dateFiltered = userTasks.filter(task => {
        // Use completion date for completed tasks, creation date for others
        const dateToCheck = task.isCompleted && task.lastCompletedDate
          ? new Date(task.lastCompletedDate).getTime()
          : task.createdAt;
        return checkDate(dateToCheck, reportFilterDate);
      });

      // Calculate stats
      const completed = dateFiltered.filter(t => t.isCompleted);
      const active = dateFiltered.filter(t => !t.isCompleted && !t.isExpired);
      const expired = dateFiltered.filter(t => t.isExpired);

      // Apply status filter for the task list
      let displayTasks = dateFiltered;
      if (reportFilterStatus === 'completed') displayTasks = completed;
      else if (reportFilterStatus === 'active') displayTasks = active;
      else if (reportFilterStatus === 'expired') displayTasks = expired;

      return {
        user,
        stats: {
          total: dateFiltered.length,
          completed: completed.length,
          active: active.length,
          expired: expired.length
        },
        tasks: displayTasks
      };
    }).filter(item => {
      // If filtering by status, only show users who have tasks in that status
      if (reportFilterStatus === 'all') return true;
      if (reportFilterStatus === 'completed') return item.stats.completed > 0;
      if (reportFilterStatus === 'active') return item.stats.active > 0;
      if (reportFilterStatus === 'expired') return item.stats.expired > 0;
      return true;
    });
  }, [users, tasks, reportFilterUser, reportFilterStatus, reportFilterDate]);
  const homeStats = useMemo(() => {
    const active = visibleByUser.filter(t => !t.isCompleted && !t.isExpired).length;
    const completed = visibleByUser.filter(t => t.isCompleted).length;
    const expired = visibleByUser.filter(t => t.isExpired).length;
    return { active, completed, expired };
  }, [visibleByUser]);

  const showSuccessNotification = (message: string, icon: string = '✅') => {
    setSuccessNotification({ show: true, message, icon });
    setTimeout(() => {
      setSuccessNotification({ show: false, message: '', icon: '' });
    }, 3000);
  };

  const openCreateCategoryModal = () => {
    setEditingCategoryId(null);
    setNewCategoryName('');
    setNewCategoryIcon(CATEGORY_ICONS[0]);
    setNewCategoryColor(CATEGORY_COLORS[0]);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    setEditingCategoryId(categoryId);
    setNewCategoryName(cat.name);
    setNewCategoryIcon(cat.icon);
    setNewCategoryColor(cat.color);
    setIsCategoryModalOpen(true);
  };

  const deleteCategoryById = (id: string) => {
    if (categories.length <= 1) return alert("En az bir kategori kalmalıdır.");
    const newCats = categories.filter(c => c.id !== id);
    setCategories(newCats);
    setTasks(tasks.filter(t => t.categoryId !== id));

    const fallbackId = newCats[0]?.id || null;
    if (activeCategoryId === id) setActiveCategoryId(fallbackId);
    if (selectedTaskCategoryId === id) setSelectedTaskCategoryId(fallbackId);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) return;

    if (editingCategoryId) {
      setCategories(prev => prev.map(cat => (
        cat.id === editingCategoryId
          ? { ...cat, name: newCategoryName.trim(), icon: newCategoryIcon, color: newCategoryColor }
          : cat
      )));
      setEditingCategoryId(null);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      return;
    }

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      color: newCategoryColor
    };
    setCategories([...categories, newCat]);
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
    setActiveCategoryId(newCat.id);
    setSelectedTaskCategoryId(newCat.id);
  };

  const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCategoryById(id);
  };

  const openCreateTaskModal = (categoryId?: string | null) => {
    setEditingTaskId(null);
    const nextCategoryId = categoryId || selectedTaskCategoryId || activeCategoryId || categories[0]?.id || null;
    setSelectedTaskCategoryId(nextCategoryId);
    // ✅ FIX: Only change activeCategoryId if categoryId parameter is explicitly provided
    // This prevents unwanted category switching when opening modal from current category
    if (categoryId) {
      setActiveCategoryId(categoryId);
    }
    // Reset task form state
    setNewTaskTitle('');
    setNewTaskExpectedDuration('01:00');
    setNewTaskRepeat('once');
    setSelectedAuditOptions([]);
    setNewTaskRequiresPhoto(false);
    // Set assignee to current user (don't reset it)
    if (currentUserId && !newTaskAssigneeId) {
      setNewTaskAssigneeId(currentUserId);
    }
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.isExpired || task.isCompleted) {
      alert('Sadece aktif görevler düzenlenebilir.');
      return;
    }
    setEditingTaskId(taskId);
    setSelectedTaskCategoryId(task.categoryId);
    setActiveCategoryId(task.categoryId);
    setNewTaskTitle(task.title);
    setNewTaskAssigneeId(task.assignedToUserId);
    setNewTaskExpectedDuration(task.expectedDuration || '01:00');
    setNewTaskRepeat(task.repeat || 'once');
    setNewTaskRequiresPhoto(Boolean(task.requiresPhoto));
    setSelectedAuditOptions(task.auditItems || []);
    setIsTaskModalOpen(true);
  };

  const resetTaskModalState = () => {
    setNewTaskTitle('');
    setNewTaskExpectedDuration('01:00');
    setNewTaskRepeat('once');
    setSelectedAuditOptions([]);
    setNewTaskRequiresPhoto(false);
    setEditingTaskId(null);
    // ✅ FIX: Reset selectedTaskCategoryId to prevent state conflicts
    setSelectedTaskCategoryId(null);
    // Keep newTaskAssigneeId as current user for next task
    if (currentUserId) {
      setNewTaskAssigneeId(currentUserId);
    }
  };

  const handleAddTask = async (titleOverride?: string) => {
    const finalTitle = typeof titleOverride === 'string' ? titleOverride : newTaskTitle;
    const assignedId = newTaskAssigneeId || currentUserId || '';
    const creatorId = currentUserId || assignedId;
    const durationMinutes = parseDurationMinutes(newTaskExpectedDuration.trim());
    const categoryIdToUse = selectedTaskCategoryId || activeCategoryId;

    if (!finalTitle.trim() || !categoryIdToUse || !assignedId || !creatorId || durationMinutes <= 0) {
      alert('Lütfen görev adı, kategori, atanan kişi ve beklenen süreyi girin.');
      return;
    }

    // Edit mode: only active tasks
    if (editingTaskId) {
      const existing = tasks.find(t => t.id === editingTaskId);
      if (!existing || existing.isExpired || existing.isCompleted) {
        alert('Sadece aktif görevler düzenlenebilir.');
        return;
      }

      const updated: Task = {
        ...existing,
        categoryId: categoryIdToUse,
        title: finalTitle.trim(),
        assignedToUserId: assignedId,
        expectedDuration: newTaskExpectedDuration.trim(),
        expectedDurationMinutes: durationMinutes,
        dueAt: Date.now() + durationMinutes * 60 * 1000,
        repeat: newTaskRepeat,
        auditItems: isAuditCategory ? selectedAuditOptions : [],
        auditResults: [],
        requiresPhoto: !isAuditCategory ? newTaskRequiresPhoto : false,
        remindersSentMinutes: [],
      };

      setTasks(prev => prev.map(t => (t.id === editingTaskId ? updated : t)));

      // Show success notification
      showSuccessNotification('Görev başarıyla güncellendi! 🎉', '✅');

      // ✅ FIX: Increased delay and separated modal close from state reset
      // to ensure state is properly saved before cleanup
      setTimeout(() => {
        setIsTaskModalOpen(false);
        setTimeout(() => {
          resetTaskModalState();
        }, 50);
      }, 150);
      return;
    }

    // Create mode
    const now = Date.now();
    const newTask: Task = {
      id: `task-${now}-${Math.random().toString(36).substr(2, 9)}`,
      categoryId: categoryIdToUse,
      title: finalTitle.trim(),
      isCompleted: false,
      createdAt: now,
      createdByUserId: creatorId,
      assignedToUserId: assignedId,
      expectedDuration: newTaskExpectedDuration.trim(),
      expectedDurationMinutes: durationMinutes,
      dueAt: now + durationMinutes * 60 * 1000,
      repeat: newTaskRepeat,
      auditItems: isAuditCategory ? selectedAuditOptions : [],
      auditResults: [],
      requiresPhoto: !isAuditCategory ? newTaskRequiresPhoto : false,
      completionPhotoDataUrl: undefined
    };

    // Add task to state first
    setTasks(prev => [newTask, ...prev]);

    // Show success notification
    const assignedUserName = users.find(u => u.id === assignedId)?.name || 'Bilinmiyor';
    showSuccessNotification(`Görev başarıyla eklendi! 📝\n${assignedUserName} kullanıcısına atandı.`, '✅');

    // ✅ FIX: Increased delay and separated modal close from state reset
    // to ensure state is properly saved before cleanup
    setTimeout(() => {
      setIsTaskModalOpen(false);
      setTimeout(() => {
        resetTaskModalState();
      }, 50);
    }, 150);

    // Send WhatsApp notification asynchronously
    const assignedUser = users.find(u => u.id === assignedId);
    if ((whatsAppEnabled || whatsAppReady) && assignedUser?.phoneNumber) {
      const category = categories.find(c => c.id === categoryIdToUse);
      const repeatLabel = newTaskRepeat === 'daily' ? 'Her gün' : 'Tek sefer';
      const durationLabel = newTaskExpectedDuration.trim() || '01:00';
      const message = `📌 Yeni görev atandı!\n\n📝 ${finalTitle.trim()}\n📁 Kategori: ${category?.name || 'Bilinmiyor'}\n⏱️ Süre: ${durationLabel}\n🔁 Tekrar: ${repeatLabel}\n\nLütfen görevi tamamlayın.`;
      try {
        await sendWhatsAppMessage(assignedUser.phoneNumber, message);
      } catch (error) {
        console.error('WhatsApp görev atama hatası:', error);
      }
    }
  };

  // Task modal: ensure a default selected category while open
  useEffect(() => {
    if (!isTaskModalOpen) return;
    const fallback = selectedTaskCategoryId || activeCategoryId || categories[0]?.id || null;
    // ✅ FIX: Removed automatic activeCategoryId change to prevent unwanted category switching
    // Only set selectedTaskCategoryId if it's not already set
    if (!selectedTaskCategoryId) setSelectedTaskCategoryId(fallback);
    // Ensure assignee is set when modal opens
    // FIX: Removed automatic overwriting of assignee here. 
    // Initialization is handled in openCreateTaskModal.

  }, [isTaskModalOpen, selectedTaskCategoryId, activeCategoryId, categories, currentUserId, editingTaskId]);

  const handleWhatsAppInitialize = async () => {
    console.log('🔵 WhatsApp başlatma butonuna tıklandı');
    console.log('🔵 BACKEND_URL:', BACKEND_URL);
    console.log('🔵 ENV_BACKEND_URL:', ENV_BACKEND_URL);
    const result = await initializeWhatsApp();
    console.log('🔵 initializeWhatsApp sonucu:', result);
    if (result.success) {
      setWhatsAppEnabled(true);
      localStorage.setItem('planla_whatsapp_enabled', 'true');
    } else {
      alert(result.message);
    }
  };

  const handleWhatsAppDisconnect = async () => {
    if (!confirm('⚠️ WhatsApp oturumunu tamamen sonlandırmak istediğinize emin misiniz?\n\nTekrar bağlanmak için QR kod taratmanız gerekecek.')) {
      return;
    }

    // ÖNCE tüm state'leri temizle (böylece useEffect durur ve otomatik yeniden başlatmaz)
    setWhatsAppEnabled(false);
    setWhatsAppReady(false);
    setQrCode(null);
    setWhatsAppInitRequested(false);
    setShowWhatsAppSettings(false); // Modal'ı kapat
    localStorage.setItem('planla_whatsapp_enabled', 'false');

    // SONRA logout API'yi çağır
    const result = await logoutWhatsApp();
    if (result.success) {
      alert('✅ WhatsApp oturumu tamamen sonlandırıldı!\n\n💡 Tekrar bağlanmak için "WhatsApp Aç" butonuna basın ve QR kodu taratın.');
    } else {
      alert('⚠️ Uyarı: ' + result.message + '\n\nAncak frontend oturumu temizlendi.');
    }
  };

  const handlePhoneNumberSave = () => {
    localStorage.setItem('planla_phone_number', phoneNumber);
    localStorage.setItem('planla_phone_number_2', secondPhoneNumber);
    alert('Telefon numaraları kaydedildi!');
  };

  const handleAddUser = () => {
    if (currentUser?.role !== 'admin') return;
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      alert('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if (users.some(user => user.username === newUserUsername.trim())) {
      alert('Bu kullanıcı adı zaten var.');
      return;
    }
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newUserName.trim(),
      username: newUserUsername.trim(),
      password: newUserPassword,
      role: newUserRole,
      phoneNumber: newUserPhone.trim() || undefined
    };
    // Add user to state first
    setUsers(prev => [...prev, newUser]);

    // Show success notification
    const roleLabel = newUserRole === 'admin' ? 'Admin' : 'Kullanıcı';
    showSuccessNotification(`${newUserName} başarıyla eklendi! 👤\n${roleLabel} olarak kaydedildi.`, '✅');

    // Clear form after a brief delay to ensure state is saved
    setTimeout(() => {
      setNewUserName('');
      setNewUserRole('user');
      setNewUserPhone('');
      setNewUserUsername('');
      setNewUserPassword('');
    }, 100);
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser?.role !== 'admin') return;
    if (userId === currentUserId) return alert('Aktif kullanıcı silinemez.');
    setUsers(prev => prev.filter(u => u.id !== userId));
    setTasks(prev => prev.map(task => {
      if (task.createdByUserId === userId || task.assignedToUserId === userId) {
        return {
          ...task,
          createdByUserId: currentUserId || task.createdByUserId,
          assignedToUserId: currentUserId || task.assignedToUserId
        };
      }
      return task;
    }));
  };

  const handleExtendTask = (taskId: string) => {
    if (currentUser?.role !== 'admin') return;
    const extraMinutesInput = prompt('Kaç dakika uzatılsın?', '60');
    if (!extraMinutesInput) return;
    const extraMinutes = Number(extraMinutesInput);
    if (Number.isNaN(extraMinutes) || extraMinutes <= 0) {
      alert('Geçerli bir dakika girin.');
      return;
    }
    const extraMs = extraMinutes * 60 * 1000;
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      const baseDueAt = task.dueAt && task.dueAt > Date.now() ? task.dueAt : Date.now();
      return {
        ...task,
        dueAt: baseDueAt + extraMs,
        isExpired: false
      };
    }));
  };

  const handleLogin = () => {
    const matchedUser = users.find(
      user => user.username === loginUsername.trim() && user.password === loginPassword
    );
    if (!matchedUser) {
      alert('Kullanıcı adı veya şifre hatalı.');
      return;
    }
    try {
      localStorage.setItem('planla_session_user_id', matchedUser.id);
    } catch { }
    setCurrentUserId(matchedUser.id);
    setNewTaskAssigneeId(matchedUser.id);
    setIsAuthModalOpen(false);
    setLoginUsername('');
    setLoginPassword('');
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setIsAuthModalOpen(true);
    try {
      localStorage.removeItem('planla_session_user_id');
      // eski anahtar kaldıysa temizle
      localStorage.removeItem('planla_current_user_id');
    } catch { }
  };

  const parseDurationMinutes = (value: string) => {
    if (!value) return 0;
    const [hoursStr, minutesStr] = value.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  };

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return 'Süre doldu';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const getReminderThresholds = (durationMinutes: number) => {
    const base = [120, 60, 30, 15, 10, 5, 2, 1];
    return base.filter(minutes => minutes > 0 && minutes < durationMinutes);
  };

  const handleAddAuditOption = () => {
    const trimmed = newAuditOption.trim();
    if (!trimmed) return;
    setAuditOptions(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
    setNewAuditOption('');
  };

  const toggleAuditOption = (option: string) => {
    setSelectedAuditOptions(prev => (
      prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
    ));
  };

  const toggleSelectAllAudit = () => {
    if (selectedAuditOptions.length === auditOptions.length) {
      setSelectedAuditOptions([]);
    } else {
      setSelectedAuditOptions(auditOptions);
    }
  };

  const removeAuditOption = (option: string) => {
    setAuditOptions(prev => prev.filter(item => item !== option));
    setSelectedAuditOptions(prev => prev.filter(item => item !== option));
  };

  const openAuditModal = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.auditItems?.length === 0) return;
    setActiveAuditTaskId(taskId);
    setAuditStepIndex(0);
    setAuditPhotoDataUrl(null);
    setIsAuditModalOpen(true);
    if (!task.auditResults || task.auditResults.length === 0) {
      const results = task.auditItems.map(item => ({ item, status: 'pending' as const }));
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, auditResults: results } : t)));
    }
  };

  const handleAuditDecision = (status: 'pass' | 'fail') => {
    const taskId = activeAuditTaskId;
    if (!taskId) return;
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId || !task.auditResults) return task;
      const updatedResults = task.auditResults.map((result, idx) => {
        if (idx !== auditStepIndex) return result;
        if (status === 'fail' && !auditPhotoDataUrl) return result;
        return {
          ...result,
          status,
          photoDataUrl: status === 'fail' ? auditPhotoDataUrl || result.photoDataUrl : undefined
        };
      });
      return { ...task, auditResults: updatedResults };
    }));

    if (status === 'fail' && !auditPhotoDataUrl) {
      alert('Eksik işaretlenen seçenek için fotoğraf yüklemelisiniz.');
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    const total = task?.auditResults?.length || task?.auditItems?.length || 0;
    const nextIndex = auditStepIndex + 1;
    setAuditPhotoDataUrl(null);
    if (nextIndex < total) {
      setAuditStepIndex(nextIndex);
    } else {
      setIsAuditModalOpen(false);
      setActiveAuditTaskId(null);
      setAuditStepIndex(0);
      toggleTask(taskId);
    }
  };

  const handleAuditPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setAuditPhotoDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompletionPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setCompletionPhotoDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeAuditTask = useMemo(
    () => tasks.find(t => t.id === activeAuditTaskId) || null,
    [tasks, activeAuditTaskId]
  );
  const activeAuditReviewTask = useMemo(
    () => tasks.find(t => t.id === activeAuditReviewTaskId) || null,
    [tasks, activeAuditReviewTaskId]
  );

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompletedState = !task.isCompleted;
    if (newCompletedState && task.requiresPhoto && !task.completionPhotoDataUrl) {
      setActiveCompletionPhotoTaskId(taskId);
      setCompletionPhotoDataUrl(null);
      setIsCompletionPhotoModalOpen(true);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (t.repeat === 'daily') {
        return {
          ...t,
          isCompleted: newCompletedState,
          lastCompletedDate: newCompletedState ? today : undefined
        };
      }
      return { ...t, isCompleted: newCompletedState };
    }));

    // Görev tamamlandıysa ve WhatsApp aktifse mesaj gönder
    if (newCompletedState && (whatsAppEnabled || whatsAppReady)) {
      const category = categories.find(c => c.id === task.categoryId);
      const message = `✅ Görev Tamamlandı!\n\n📝 ${task.title}\n📁 Kategori: ${category?.name || 'Bilinmiyor'}\n⏰ ${new Date().toLocaleString('tr-TR')}`;
      try {
        await sendNotificationMessage(message);
        console.log('WhatsApp mesajı gönderildi');
      } catch (error) {
        console.error('WhatsApp mesaj hatası:', error);
      }
    }
  };

  const deleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      alert('Görev silme yetkisi sadece admin\'dedir.');
      return;
    }
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleAddRental = () => {
    const unit = newRentalUnit.trim();
    const name = newRentalName.trim();
    const dueDay = Number(newRentalDueDay);
    const amount = Number(newRentalAmount.replace(',', '.'));
    if (!unit || !name || Number.isNaN(dueDay) || Number.isNaN(amount)) {
      alert('Lütfen daire numarası, isim soyisim, kira günü ve tutarı girin.');
      return;
    }
    if (dueDay < 1 || dueDay > 31 || amount <= 0) {
      alert('Kira günü 1-31 arasında, tutar 0\'dan büyük olmalıdır.');
      return;
    }
    const newRental: Rental = {
      id: `rental-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      unitNumber: unit,
      tenantName: name,
      dueDay,
      amount,
      isPaid: false,
      paidMonth: undefined,
      lastReminderMonth: undefined,
      createdAt: Date.now()
    };
    setRentals([newRental, ...rentals]);

    // Show success notification
    showSuccessNotification(`Kira başarıyla eklendi! 🏠\nDaire: ${unit} - ${name}`, '✅');

    setNewRentalUnit('');
    setNewRentalName('');
    setNewRentalDueDay('1');
    setNewRentalAmount('');
    setIsRentalModalOpen(false);
    setActiveSection('rentals');
  };

  const toggleRentalPaid = (rentalId: string) => {
    const monthKey = getMonthKey(new Date());
    const actorUserId = currentUserId;
    if (!actorUserId) {
      setIsAuthModalOpen(true);
      alert('Ödeme işlemi için önce giriş yapmalısınız.');
      return;
    }
    setRentals(prev => prev.map(rental => {
      if (rental.id !== rentalId) return rental;
      const isPaidForMonth = rental.paidMonth === monthKey;
      if (isPaidForMonth) {
        return { ...rental, isPaid: false, paidMonth: undefined, paidByUserId: undefined, paidAt: undefined };
      }
      return { ...rental, isPaid: true, paidMonth: monthKey, paidByUserId: actorUserId, paidAt: Date.now(), lastReminderMonth: undefined };
    }));
  };

  const deleteRental = (rentalId: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Sadece admin kiraları silebilir.');
      return;
    }
    setRentals(prev => prev.filter(rental => rental.id !== rentalId));
  };

  const handleAddAsset = () => {
    const name = newAssetName.trim();
    const room = newAssetRoom.trim();
    const assignedAt = newAssetDate.trim();
    const note = newAssetNote.trim();
    if (!name || !room || !assignedAt) {
      alert('Lütfen ürün adı, oda ve veriliş tarihini girin.');
      return;
    }
    const newItem: AssetItem = {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      room,
      assignedAt,
      note,
      createdAt: Date.now()
    };
    setAssets([newItem, ...assets]);

    // Show success notification
    showSuccessNotification(`Stok başarıyla eklendi! 🧰\n${name} - ${room}`, '✅');

    setNewAssetName('');
    setNewAssetRoom('');
    setNewAssetDate('');
    setNewAssetNote('');
    setIsAssetModalOpen(false);
    setActiveSection('assets');
  };

  const deleteAsset = (assetId: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Sadece admin stok silebilir.');
      return;
    }
    setAssets(prev => prev.filter(item => item.id !== assetId));
  };

  // 🔒 Zorunlu giriş: oturum açmadan uygulama ekranları görünmesin
  if (isHydrated && !currentUserId) {
    return (
      <div className="min-h-[100dvh] w-full overflow-x-hidden app-bg text-slate-900 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md modal-shell p-8 md:p-12 animate-sheet-in">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-indigo-100 text-indigo-600 text-3xl">
              🔐
            </div>
            <div className="flex-1">
              <h3 className="text-4xl font-black tracking-tighter text-slate-800">Giriş Yap</h3>
              <p className="text-slate-400 font-bold text-sm mt-1">Kullanıcı adı ve şifre</p>
            </div>
          </div>

          <div className="space-y-6">
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Kullanıcı adı"
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Şifre"
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-slate-800 active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              Giriş Yap
            </button>
          </div>

          <div className="mt-8 text-xs font-bold text-slate-400">
            Varsayılan admin: <span className="font-black text-slate-600">admin / admin123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden app-bg text-slate-900">
      <div className="relative min-h-[100dvh] px-0 md:px-6 lg:px-10 py-0 md:py-6 app-safe overflow-x-hidden">
        <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="w-full mx-auto max-w-[1400px] overflow-hidden">
          <div className="min-h-[100dvh] flex flex-col lg:flex-row overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden lg:flex lg:w-[340px] nav-glass border-r border-slate-200/60 flex-col h-[100dvh] sticky top-0 z-30">
              <div className="p-8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/60 float-slow">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-indigo-600 via-blue-600 to-fuchsia-600 bg-clip-text text-transparent">
                      Planla
                    </h1>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/70 border border-slate-200/60">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 border border-slate-200/70" />
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                          {currentUser ? `${currentUser.name} ${currentUser.role === 'admin' ? '(Admin)' : ''}` : 'Giriş yap'}
                        </div>
                      </div>
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => setIsUserModalOpen(true)}
                          className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-2xl bg-white/70 border border-slate-200/60 text-slate-700 hover:shadow-lg hover:shadow-indigo-100 transition-all hover-glow"
                        >
                          Kullanıcılar
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-2xl bg-white/70 border border-slate-200/60 text-slate-600 hover:text-slate-800 transition-all hover-glow"
                      >
                        Çıkış
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className={`p-3 rounded-2xl transition-all border ${whatsAppReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-lg shadow-emerald-100' : 'bg-white/70 text-slate-600 border-slate-200/60 hover:shadow-lg hover:shadow-slate-200'}`}
                  title="WhatsApp Ayarları"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </button>
              </div>

              <nav className="flex flex-col flex-1 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-4">MENÜ</p>
                <div
                  onClick={() => setActiveSection('home')}
                  className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all duration-300 hover-glow ${activeSection === 'home' ? 'active-pill text-slate-900 translate-x-1' : 'hover:bg-white/70 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl leading-none">✨</span>
                    <span className="font-black tracking-tight text-[13px] leading-none truncate whitespace-nowrap">Anasayfa</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setActiveSection('tasks');
                    setActiveCategoryId(null); // "Tüm Görevler" görünümü
                  }}
                  className={`mt-3 flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all duration-300 hover-glow ${activeSection === 'tasks' && !activeCategoryId ? 'active-pill text-slate-900 translate-x-1' : 'hover:bg-white/70 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl leading-none">📝</span>
                    <span className="font-black tracking-tight text-[13px] leading-none truncate whitespace-nowrap">Görevler</span>
                  </div>
                </div>
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={(e) => {
                      // Prevent navigation if clicking on delete button
                      if ((e.target as HTMLElement).closest('button[data-delete]')) {
                        return;
                      }
                      setActiveSection('tasks');
                      setActiveCategoryId(cat.id);
                    }}
                    className={`group flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all duration-300 hover-glow ${activeSection === 'tasks' && activeCategoryId === cat.id
                      ? `active-pill text-slate-900 translate-x-1`
                      : 'hover:bg-white/70 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl leading-none">{cat.icon}</span>
                      <span className="font-black tracking-tight text-[13px] leading-none truncate whitespace-nowrap">{cat.name}</span>
                    </div>
                    <button
                      data-delete
                      onClick={(e) => handleDeleteCategory(cat.id, e)}
                      className="p-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 hover:text-rose-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full mt-6 py-4 border-2 border-dashed border-slate-300/70 rounded-3xl text-slate-600 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest bg-white/70 hover:bg-white btn-glow tap-scale"
                >
                  <PlusIcon className="w-4 h-4" /> Yeni Kategori
                </button>
                <div
                  onClick={() => setActiveSection('rentals')}
                  className={`mt-6 flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all duration-300 hover-glow ${activeSection === 'rentals' ? 'active-pill text-slate-900 translate-x-1' : 'hover:bg-white/70 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl leading-none">🏠</span>
                    <span className="font-black tracking-tight text-[13px] leading-none truncate whitespace-nowrap">Kiralar</span>
                  </div>
                </div>
                <div
                  onClick={() => setActiveSection('assets')}
                  className={`mt-3 flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all duration-300 hover-glow ${activeSection === 'assets' ? 'active-pill text-slate-900 translate-x-1' : 'hover:bg-white/70 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl leading-none">🧰</span>
                    <span className="font-black tracking-tight text-[13px] leading-none truncate whitespace-nowrap">Stok</span>
                  </div>
                </div>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 pb-28 lg:pb-12 lg:p-12 overflow-y-auto custom-scrollbar">
              {activeSection === 'home' ? (
                <div className="max-w-4xl mx-auto space-y-10">
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 header-glass p-5 sm:p-6 md:p-8 rounded-[2.5rem] overflow-hidden">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                      <div className="text-4xl sm:text-5xl md:text-6xl p-5 sm:p-6 md:p-7 rounded-[2.2rem] bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-2xl shadow-indigo-200/60 transform -rotate-2 float-slow shrink-0">
                        ✨
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-4">
                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight truncate">Anasayfa</h2>

                          {/* View Switcher */}
                          <div className="hidden md:flex bg-white/50 p-1 rounded-2xl border border-slate-200/50">
                            <button
                              onClick={() => setHomeView('tasks')}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${homeView === 'tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-white/50'
                                }`}
                            >
                              Görevler
                            </button>
                            <button
                              onClick={() => setHomeView('report')}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${homeView === 'report' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-white/50'
                                }`}
                            >
                              Rapor
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-slate-600 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.18em] md:tracking-[0.2em] leading-snug break-words md:whitespace-nowrap">
                            {homeStats.active} aktif · {homeStats.completed} tamamlanan · {homeStats.expired} geciken
                          </p>
                        </div>

                        {/* Mobile View Switcher */}
                        <div className="flex md:hidden mt-4 bg-white/50 p-1 rounded-2xl border border-slate-200/50 w-fit">
                          <button
                            onClick={() => setHomeView('tasks')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${homeView === 'tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-white/50'
                              }`}
                          >
                            Görevler
                          </button>
                          <button
                            onClick={() => setHomeView('report')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${homeView === 'report' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-white/50'
                              }`}
                          >
                            Rapor
                          </button>
                        </div>
                      </div>
                    </div>

                    {homeView === 'tasks' && (
                      <div className="w-full md:w-auto flex flex-wrap items-center gap-2 justify-start md:justify-end">
                        <button
                          onClick={() => setHomeFilterStatus('active')}
                          className={`px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${homeFilterStatus === 'active' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                            }`}
                        >
                          Aktif
                        </button>
                        <button
                          onClick={() => setHomeFilterStatus('completed')}
                          className={`px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${homeFilterStatus === 'completed' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                            }`}
                        >
                          Tamamlanan
                        </button>
                        <button
                          onClick={() => setHomeFilterStatus('expired')}
                          className={`px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${homeFilterStatus === 'expired' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                            }`}
                        >
                          Geciken
                        </button>
                        <button
                          onClick={() => setHomeFilterStatus('all')}
                          className={`px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${homeFilterStatus === 'all' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                            }`}
                        >
                          Tümü
                        </button>
                      </div>
                    )}
                  </header>

                  {homeView === 'report' ? (
                    <div className="animate-fade-in space-y-6">
                      {/* Report Filters */}
                      <div className="card-glass rounded-[2.5rem] p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* User Filter */}
                          <div className="relative">
                            <select
                              value={reportFilterUser}
                              onChange={(e) => setReportFilterUser(e.target.value)}
                              className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700 appearance-none"
                            >
                              <option value="all">Tüm Kullanıcılar</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                            <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Kullanıcı
                            </label>
                          </div>

                          {/* Status Filter */}
                          <div className="relative">
                            <select
                              value={reportFilterStatus}
                              onChange={(e) => setReportFilterStatus(e.target.value)}
                              className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700 appearance-none"
                            >
                              <option value="all">Tümü</option>
                              <option value="active">Aktif</option>
                              <option value="completed">Tamamlanan</option>
                              <option value="expired">Geciken</option>
                            </select>
                            <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Durum
                            </label>
                          </div>

                          {/* Date Filter */}
                          <div className="relative">
                            <select
                              value={reportFilterDate}
                              onChange={(e) => setReportFilterDate(e.target.value as any)}
                              className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700 appearance-none"
                            >
                              <option value="today">Bugün</option>
                              <option value="week">Bu Hafta</option>
                              <option value="month">Bu Ay</option>
                              <option value="all">Tüm Zamanlar</option>
                            </select>
                            <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Zaman
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Report Cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {dailyReport.map(({ user, stats, tasks: userTasks }) => (
                          <div key={user.id} className="card-glass rounded-[2.5rem] p-6 lg:p-8 hover-glow transition-all">
                            {/* User Header */}
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-200">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{user.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                    {user.role === 'admin' ? 'Yönetici' : 'Personel'}
                                  </span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                    {stats.total} Görev
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                              <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                                <div className="text-2xl font-black text-emerald-600 mb-1">{stats.completed}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Tamamlanan</div>
                              </div>
                              <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100">
                                <div className="text-2xl font-black text-amber-600 mb-1">{stats.active}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-amber-400">Aktif</div>
                              </div>
                              <div className="bg-rose-50 rounded-2xl p-4 text-center border border-rose-100">
                                <div className="text-2xl font-black text-rose-600 mb-1">{stats.expired}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-rose-400">Geciken</div>
                              </div>
                            </div>

                            {/* Task List (Compact) */}
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                              {userTasks.length > 0 ? (
                                userTasks.map(task => {
                                  const cat = categories.find(c => c.id === task.categoryId);
                                  return (
                                    <div key={task.id} className={`p-4 rounded-2xl border transition-all ${task.isCompleted ? 'bg-emerald-50/50 border-emerald-100 opacity-80' :
                                      task.isExpired ? 'bg-rose-50/50 border-rose-100' :
                                        'bg-white/60 border-slate-100'
                                      }`}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className={`font-bold text-sm truncate ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                                            {task.title}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                              <span>{cat?.icon || '📌'}</span> {cat?.name}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="shrink-0">
                                          {task.isCompleted ? (
                                            <span className="text-lg">✅</span>
                                          ) : task.isExpired ? (
                                            <span className="text-lg">⏰</span>
                                          ) : (
                                            <span className="text-lg">⏳</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                  Görev bulunamadı
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {dailyReport.length === 0 && (
                        <div className="text-center py-24 card-glass rounded-[3rem] border-2 border-dashed border-slate-200/70">
                          <div className="text-6xl mb-6 opacity-60">📊</div>
                          <h3 className="text-2xl font-black text-slate-700 tracking-tighter">KAYIT BULUNAMADI</h3>
                          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
                            Lütfen filtreleri kontrol edin.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Floating-label filter panel (no extra state) */}
                      <div className="card-glass rounded-[2.5rem] p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="relative">
                            <select
                              value={homeFilterCategory}
                              onChange={(e) => setHomeFilterCategory(e.target.value)}
                              className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700 appearance-none"
                            >
                              <option value="all">Tümü</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                            <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Kategori
                            </label>
                          </div>

                          <div className="relative md:col-span-2">
                            <input
                              type="text"
                              value={homeFilterText}
                              onChange={(e) => setHomeFilterText(e.target.value)}
                              placeholder=" "
                              className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700"
                            />
                            <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Görev adıyla ara
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {homeTasks.map(task => {
                          const category = categories.find(c => c.id === task.categoryId);
                          const statusLabel = task.isExpired ? 'Geciken' : task.isCompleted ? 'Tamamlandı' : 'Aktif';
                          const remainingMs = task.dueAt ? task.dueAt - nowTs : 0;
                          const totalMs = task.dueAt && task.createdAt ? Math.max(1, task.dueAt - task.createdAt) : 1;
                          const progressPct = task.dueAt ? Math.min(100, Math.max(0, (remainingMs / totalMs) * 100)) : 0;
                          return (
                            <div
                              key={task.id}
                              className={`group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 card-glass rounded-[2.5rem] transition-all duration-300 tap-scale hover-glow ${task.isExpired ? 'ring-2 ring-rose-300/60' : task.isCompleted ? 'opacity-70' : ''
                                }`}
                            >
                              {/* Left color bar */}
                              <div className={`absolute left-0 top-0 bottom-0 w-2 ${category?.color || 'bg-slate-300'} opacity-90`} />

                              <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${category?.color || 'bg-slate-300'} text-white shadow-md shadow-slate-200`}>
                                  {category?.icon || '📌'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-2xl font-black text-slate-900 tracking-tight truncate">
                                    {task.title}
                                  </div>
                                  <div className="text-sm font-bold text-slate-500 truncate">
                                    {category?.name || 'Kategori Yok'}
                                  </div>

                                  {/* Status + remaining */}
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${task.isExpired
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : task.isCompleted
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}>
                                      {statusLabel}
                                    </span>

                                    {task.dueAt && !task.isCompleted && !task.isExpired && (
                                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                        Kalan: {formatRemaining(task.dueAt - nowTs)}
                                      </span>
                                    )}
                                  </div>

                                  {task.dueAt && !task.isCompleted && !task.isExpired && (
                                    <div className="mt-3">
                                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-400 to-indigo-500"
                                          style={{ width: `${progressPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {homeTasks.length === 0 && (
                          <div className="text-center py-32 card-glass rounded-[3rem] border-2 border-dashed border-slate-200/70">
                            <div className="text-8xl mb-8 opacity-60 float-slow">✨</div>
                            <h3 className="text-3xl font-black text-slate-700 tracking-tighter">BUGÜN İŞ YOK</h3>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
                              Filtreyi değiştirerek diğer görevleri görebilirsin.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : activeSection === 'tasks' ? (
                activeCategory ? (
                  <div className="max-w-4xl mx-auto space-y-10">
                    <header className="relative overflow-hidden header-glass p-8 rounded-[2.5rem]">
                      <div className="absolute inset-0 pointer-events-none">
                        <div className={`absolute -top-16 -left-16 h-56 w-56 rounded-full ${activeCategory.color} opacity-20 blur-3xl`} />
                        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
                      </div>

                      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className={`text-6xl p-7 rounded-[2.2rem] ${activeCategory.color} text-white shadow-2xl shadow-slate-200 transform -rotate-2 float-slow`}>
                            {activeCategory.icon}
                          </div>
                          <div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{activeCategory.name}</h2>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <p className="text-slate-600 font-black text-[9px] uppercase tracking-[0.2em] whitespace-nowrap">
                                {taskView === 'active' ? activeTasks.length : taskView === 'completed' ? completedTasks.length : expiredTasks.length} {taskView === 'active' ? 'Aktif Görev' : taskView === 'completed' ? 'Tamamlanan Görev' : 'Yapılmayan Görev'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desktop add button (mobile uses FAB) */}
                        <button
                          onClick={() => openCreateTaskModal(activeCategoryId)}
                          className="hidden md:flex group items-center gap-4 px-10 py-6 btn-accent btn-glow text-white rounded-[2rem] font-black hover:opacity-95 transition-all tap-scale"
                        >
                          <PlusIcon className="group-hover:rotate-90 transition-transform w-5 h-5" />
                          GÖREV EKLE
                        </button>
                      </div>

                      {/* Segmented control (sticky on mobile) */}
                      <div className="relative mt-6 md:mt-8">
                        <div className="md:hidden sticky top-3 z-20">
                          <div className="mx-auto max-w-[520px] bg-white/80 border border-slate-200/70 rounded-full p-1 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                onClick={() => setTaskView('active')}
                                className={`py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'active' ? 'btn-primary text-white' : 'text-slate-600 hover:bg-white'
                                  }`}
                              >
                                Aktif
                              </button>
                              <button
                                onClick={() => setTaskView('completed')}
                                className={`py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'completed' ? 'btn-primary text-white' : 'text-slate-600 hover:bg-white'
                                  }`}
                              >
                                Tamamlanan
                              </button>
                              <button
                                onClick={() => setTaskView('expired')}
                                className={`py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'expired' ? 'btn-primary text-white' : 'text-slate-600 hover:bg-white'
                                  }`}
                              >
                                Yapılmayan
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-2">
                          <button
                            onClick={() => setTaskView('active')}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'active' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                              }`}
                          >
                            Aktif
                          </button>
                          <button
                            onClick={() => setTaskView('completed')}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'completed' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                              }`}
                          >
                            Tamamlanan
                          </button>
                          <button
                            onClick={() => setTaskView('expired')}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'expired' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                              }`}
                          >
                            Yapılmayan
                          </button>
                        </div>
                      </div>
                    </header>

                    <div className="space-y-4">
                      {visibleTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (task.categoryId === activeCategoryId && activeCategory?.name === 'Denetim') {
                              if (task.isCompleted && task.auditResults?.some(result => result.status === 'fail')) {
                                setActiveAuditReviewTaskId(task.id);
                                setIsAuditReviewOpen(true);
                              } else {
                                openAuditModal(task.id);
                              }
                            }
                          }}
                          className={`group relative overflow-hidden flex flex-col md:flex-row md:items-center gap-6 justify-between p-6 md:p-8 card-glass rounded-[2.5rem] transition-all duration-300 tap-scale hover-glow ${task.isCompleted ? 'opacity-50 grayscale' : ''
                            }`}
                        >
                          {/* Left category bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-2 ${activeCategory?.color || 'bg-slate-300'} opacity-80`} />

                          <div className="flex items-start md:items-center gap-5 md:gap-8 flex-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); if (!task.isExpired) toggleTask(task.id); }}
                              disabled={task.isExpired}
                              className={`w-14 h-14 md:w-12 md:h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 touch-manipulation ${task.isExpired
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : task.isCompleted
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100'
                                }`}
                            >
                              {task.isCompleted && <CheckIcon className="w-8 h-8 stroke-[4px]" />}
                            </button>
                            <div className="flex flex-col gap-2">
                              <span className={`text-2xl font-black text-slate-900 tracking-tight transition-all ${task.isCompleted ? 'line-through opacity-60' : ''}`}>
                                {task.title}
                              </span>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Ekleyen: {users.find(u => u.id === task.createdByUserId)?.name || 'Bilinmiyor'} · Atanan: {users.find(u => u.id === task.assignedToUserId)?.name || 'Bilinmiyor'} · Süre: {task.expectedDuration || '00:00'} · {task.repeat === 'daily' ? 'Her gün' : 'Tek sefer'}
                              </span>
                              {task.auditItems && task.auditItems.length > 0 && (
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                  Denetim: {task.auditItems.length} seçenek
                                </span>
                              )}

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {task.requiresPhoto && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-50 text-cyan-700 border border-cyan-200">
                                    Fotoğraf zorunlu
                                  </span>
                                )}
                                {task.completionPhotoDataUrl && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Fotoğraf eklendi
                                  </span>
                                )}
                                {task.auditResults && task.auditResults.some(result => result.status === 'fail') && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                                    Eksikler var
                                  </span>
                                )}
                                {task.isExpired && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                                    Süresi geçti
                                  </span>
                                )}
                              </div>

                              {task.dueAt && !task.isCompleted && !task.isExpired && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                      Geri sayım: {formatRemaining(task.dueAt - nowTs)}
                                    </span>
                                  </div>
                                  <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
                                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-400 to-indigo-500 w-[65%] animate-pulse" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 md:gap-4 justify-end">
                            {task.isCompleted && task.auditResults?.some(result => result.status === 'fail') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAuditReviewTaskId(task.id);
                                  setIsAuditReviewOpen(true);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                              >
                                Fotoğrafları Gör
                              </button>
                            )}
                            {task.isExpired && currentUser?.role === 'admin' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleExtendTask(task.id); }}
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                              >
                                Süreyi Uzat
                              </button>
                            )}
                            {!task.isExpired && !task.isCompleted && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditTaskModal(task.id); }}
                                className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-white/70 border border-slate-200/70 text-slate-600 hover:bg-white transition-all tap-scale"
                              >
                                Düzenle
                              </button>
                            )}

                            <button
                              onClick={(e) => { e.stopPropagation(); deleteTask(task.id, e); }}
                              disabled={!isAdmin}
                              className={`p-3 rounded-2xl transition-all opacity-0 group-hover:opacity-100 ${!isAdmin ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                            >
                              <TrashIcon className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {visibleTasks.length === 0 && (
                        <div className="text-center py-32 card-glass rounded-[3rem] border-2 border-dashed border-slate-200/70">
                          <div className="text-8xl mb-8 opacity-60 float-slow">✨</div>
                          <h3 className="text-3xl font-black text-slate-700 tracking-tighter">
                            {taskView === 'active' ? 'HER ŞEY YOLUNDA!' : taskView === 'completed' ? 'TAMAMLANAN YOK' : 'YAPILMAYAN YOK'}
                          </h3>
                          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
                            {taskView === 'active' ? 'Bugünlük planların bitti.' : taskView === 'completed' ? 'Henüz tamamlanan görev yok.' : 'Süresi geçen görev yok.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-10">
                    <header className="relative overflow-hidden header-glass p-8 rounded-[2.5rem]">
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
                        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
                      </div>

                      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className="text-6xl p-7 rounded-[2.2rem] bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-2xl shadow-indigo-200/60 transform -rotate-2 float-slow">
                            📝
                          </div>
                          <div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Görevler</h2>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <p className="text-slate-600 font-black text-[9px] uppercase tracking-[0.2em] whitespace-nowrap">
                                {tasksAllFiltered.length} kayıt · {tasksAllFilterCategory === 'all' ? 'Tüm kategoriler' : (categories.find(c => c.id === tasksAllFilterCategory)?.name || 'Kategori')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desktop add button (mobile uses FAB) */}
                        <button
                          onClick={() => openCreateTaskModal(tasksAllFilterCategory !== 'all' ? tasksAllFilterCategory : null)}
                          className="hidden md:flex group items-center gap-4 px-10 py-6 btn-accent btn-glow text-white rounded-[2rem] font-black hover:opacity-95 transition-all tap-scale"
                        >
                          <PlusIcon className="group-hover:rotate-90 transition-transform w-5 h-5" />
                          GÖREV EKLE
                        </button>
                      </div>

                      {/* Segmented control */}
                      <div className="relative mt-6 md:mt-8">
                        <div className="md:hidden sticky top-3 z-20">
                          <div className="mx-auto max-w-[520px] bg-white/80 border border-slate-200/70 rounded-full p-1 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                onClick={() => setTaskView('active')}
                                className={`py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'active' ? 'btn-primary text-white' : 'text-slate-600 hover:bg-white'
                                  }`}
                              >
                                Aktif
                              </button>
                              <button
                                onClick={() => setTaskView('completed')}
                                className={`py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'completed' ? 'btn-primary text-white' : 'text-slate-600 hover:bg-white'
                                  }`}
                              >
                                Tamamlanan
                              </button>
                              <button
                                onClick={() => setTaskView('expired')}
                                className={`py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'expired' ? 'btn-primary text-white' : 'text-slate-600 hover:bg-white'
                                  }`}
                              >
                                Yapılmayan
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-2">
                          <button
                            onClick={() => setTaskView('active')}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'active' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                              }`}
                          >
                            Aktif
                          </button>
                          <button
                            onClick={() => setTaskView('completed')}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'completed' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                              }`}
                          >
                            Tamamlanan
                          </button>
                          <button
                            onClick={() => setTaskView('expired')}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all tap-scale ${taskView === 'expired' ? 'btn-primary text-white btn-glow' : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-white'
                              }`}
                          >
                            Yapılmayan
                          </button>
                        </div>
                      </div>
                    </header>

                    {/* Filters */}
                    <div className="card-glass rounded-[2.5rem] p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                          <select
                            value={tasksAllFilterCategory}
                            onChange={(e) => setTasksAllFilterCategory(e.target.value)}
                            className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700 appearance-none"
                          >
                            <option value="all">Tüm Kategoriler</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                          <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Kategori
                          </label>
                        </div>

                        <div className="relative md:col-span-2">
                          <input
                            type="text"
                            value={tasksAllFilterText}
                            onChange={(e) => setTasksAllFilterText(e.target.value)}
                            placeholder=" "
                            className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700"
                          />
                          <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Görev adıyla ara
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {tasksAllFiltered.map(task => {
                        const taskCategory = categories.find(c => c.id === task.categoryId);
                        const isTaskAudit = taskCategory?.name === 'Denetim';
                        return (
                          <div
                            key={task.id}
                            onClick={() => {
                              if (isTaskAudit) {
                                if (task.isCompleted && task.auditResults?.some(result => result.status === 'fail')) {
                                  setActiveAuditReviewTaskId(task.id);
                                  setIsAuditReviewOpen(true);
                                } else {
                                  openAuditModal(task.id);
                                }
                              }
                            }}
                            className={`group relative overflow-hidden flex flex-col md:flex-row md:items-center gap-6 justify-between p-6 md:p-8 card-glass rounded-[2.5rem] transition-all duration-300 tap-scale hover-glow ${task.isCompleted ? 'opacity-50 grayscale' : ''
                              }`}
                          >
                            {/* Left category bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${taskCategory?.color || 'bg-slate-300'} opacity-80`} />

                            <div className="flex items-start md:items-center gap-5 md:gap-8 flex-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); if (!task.isExpired) toggleTask(task.id); }}
                                disabled={task.isExpired}
                                className={`w-14 h-14 md:w-12 md:h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 touch-manipulation ${task.isExpired
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : task.isCompleted
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100'
                                  }`}
                              >
                                {task.isCompleted && <CheckIcon className="w-8 h-8 stroke-[4px]" />}
                              </button>
                              <div className="flex flex-col gap-2 min-w-0">
                                <span className={`text-2xl font-black text-slate-900 tracking-tight transition-all truncate ${task.isCompleted ? 'line-through opacity-60' : ''}`}>
                                  {task.title}
                                </span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
                                  {taskCategory ? `${taskCategory.icon} ${taskCategory.name}` : 'Kategori Yok'}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                  Ekleyen: {users.find(u => u.id === task.createdByUserId)?.name || 'Bilinmiyor'} · Atanan: {users.find(u => u.id === task.assignedToUserId)?.name || 'Bilinmiyor'} · Süre: {task.expectedDuration || '00:00'} · {task.repeat === 'daily' ? 'Her gün' : 'Tek sefer'}
                                </span>

                                {task.auditItems && task.auditItems.length > 0 && (
                                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Denetim: {task.auditItems.length} seçenek
                                  </span>
                                )}

                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {task.requiresPhoto && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-50 text-cyan-700 border border-cyan-200">
                                      Fotoğraf zorunlu
                                    </span>
                                  )}
                                  {task.completionPhotoDataUrl && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Fotoğraf eklendi
                                    </span>
                                  )}
                                  {task.auditResults && task.auditResults.some(result => result.status === 'fail') && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                                      Eksikler var
                                    </span>
                                  )}
                                  {task.isExpired && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                                      Süresi geçti
                                    </span>
                                  )}
                                </div>

                                {task.dueAt && !task.isCompleted && !task.isExpired && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                        Geri sayım: {formatRemaining(task.dueAt - nowTs)}
                                      </span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
                                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-400 to-indigo-500 w-[65%] animate-pulse" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 md:gap-4 justify-end">
                              {task.isCompleted && task.auditResults?.some(result => result.status === 'fail') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveAuditReviewTaskId(task.id);
                                    setIsAuditReviewOpen(true);
                                  }}
                                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                                >
                                  Fotoğrafları Gör
                                </button>
                              )}
                              {task.isExpired && currentUser?.role === 'admin' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleExtendTask(task.id); }}
                                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                                >
                                  Süreyi Uzat
                                </button>
                              )}
                              {!task.isExpired && !task.isCompleted && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditTaskModal(task.id); }}
                                  className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-white/70 border border-slate-200/70 text-slate-600 hover:bg-white transition-all tap-scale"
                                >
                                  Düzenle
                                </button>
                              )}

                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTask(task.id, e); }}
                                disabled={!isAdmin}
                                className={`p-3 rounded-2xl transition-all opacity-0 group-hover:opacity-100 ${!isAdmin ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                              >
                                <TrashIcon className="w-6 h-6" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {tasksAllFiltered.length === 0 && (
                        <div className="text-center py-32 card-glass rounded-[3rem] border-2 border-dashed border-slate-200/70">
                          <div className="text-8xl mb-8 opacity-60 float-slow">📝</div>
                          <h3 className="text-3xl font-black text-slate-700 tracking-tighter">
                            {taskView === 'active' ? 'AKTİF GÖREV YOK' : taskView === 'completed' ? 'TAMAMLANAN YOK' : 'YAPILMAYAN YOK'}
                          </h3>
                          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
                            Filtreyi değiştirerek diğer görevleri görebilirsin.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : activeSection === 'rentals' ? (
                <div className="max-w-4xl mx-auto space-y-10">
                  <header className="relative overflow-hidden header-glass p-10 rounded-[3rem]">
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
                      <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                    </div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="text-6xl p-8 rounded-[2.5rem] bg-emerald-500 text-white shadow-2xl shadow-slate-200 transform -rotate-2 float-slow">
                          🏠
                        </div>
                        <div>
                          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Kiralar</h2>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] whitespace-nowrap">
                              {rentalsWithStatus.length} kayıt
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsRentalModalOpen(true)}
                        className="group flex items-center gap-4 px-10 py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-[2rem] font-black shadow-2xl hover:opacity-95 transition-all active:scale-95 shadow-emerald-200 btn-glow"
                      >
                        <PlusIcon className="group-hover:rotate-90 transition-transform w-5 h-5" />
                        KİRA EKLE
                      </button>
                    </div>
                  </header>

                  <div className="space-y-4">
                    {rentalsWithStatus.map(rental => {
                      const isOverdue = rental.overdueDays >= 3 && !rental.isPaidForMonth;
                      return (
                        <div
                          key={rental.id}
                          className={`group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 card-glass rounded-[2.5rem] transition-all duration-300 tap-scale hover-glow ${isOverdue ? 'ring-2 ring-rose-300/60' : ''
                            }`}
                        >
                          {/* left accent */}
                          <div className={`absolute left-0 top-0 bottom-0 w-2 ${rental.isPaidForMonth ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-amber-500'} opacity-80`} />

                          <div className="flex items-center gap-6">
                            <div className="relative">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${rental.isPaidForMonth ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                {rental.isPaidForMonth ? '✅' : '⏳'}
                              </div>
                              {isOverdue && (
                                <div className="absolute -inset-1 rounded-[1.2rem] ring-2 ring-rose-300/70 animate-pulse" />
                              )}
                            </div>
                            <div>
                              <div className="text-2xl font-black text-slate-800 tracking-tight">
                                Daire {rental.unitNumber}
                              </div>
                              <div className="text-sm font-bold text-slate-500">
                                {rental.tenantName}
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                                Kira günü: {rental.dueDay} · Tutar: {formatCurrency(rental.amount)}
                              </div>
                              {rental.isPaidForMonth && (
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
                                  Ödemeyi alan:{' '}
                                  {users.find(u => u.id === rental.paidByUserId)?.name || 'Bilinmiyor'}
                                </div>
                              )}
                              {isOverdue && (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-widest">
                                  {rental.overdueDays} gün gecikmede
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleRentalPaid(rental.id)}
                              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all tap-scale ${rental.isPaidForMonth
                                ? 'bg-white/70 border border-slate-200/70 text-slate-600 hover:bg-white'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                                }`}
                            >
                              {rental.isPaidForMonth ? 'Ödeme İptal' : 'Ödendi'}
                            </button>
                            <button
                              onClick={() => deleteRental(rental.id)}
                              className="p-3 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              title="Sil"
                            >
                              <TrashIcon className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {rentalsWithStatus.length === 0 && (
                      <div className="text-center py-44 card-glass rounded-[4rem] border-2 border-dashed border-slate-200/70">
                        <div className="text-8xl mb-8 opacity-60 float-slow">🏠</div>
                        <h3 className="text-3xl font-black text-slate-700 tracking-tighter">KİRA KAYDI YOK</h3>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
                          İlk kira kaydını ekleyin.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-10">
                  <header className="relative overflow-hidden header-glass p-10 rounded-[3rem]">
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
                      <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
                    </div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="text-6xl p-8 rounded-[2.5rem] bg-sky-500 text-white shadow-2xl shadow-slate-200 transform -rotate-2 float-slow">
                          🧰
                        </div>
                        <div>
                          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Stok</h2>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                            <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] whitespace-nowrap">
                              {filteredAssets.length} kayıt
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAssetModalOpen(true)}
                        className="group flex items-center gap-4 px-10 py-6 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white rounded-[2rem] font-black shadow-2xl hover:opacity-95 transition-all active:scale-95 shadow-sky-200 btn-glow"
                      >
                        <PlusIcon className="group-hover:rotate-90 transition-transform w-5 h-5" />
                        STOK EKLE
                      </button>
                    </div>
                  </header>

                  <div className="sticky top-4 z-10 card-glass rounded-[2.5rem] border border-slate-200/70 shadow-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={assetFilterRoom}
                          onChange={(e) => setAssetFilterRoom(e.target.value)}
                          placeholder=" "
                          className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-sky-500/10 focus:border-sky-500 font-black text-slate-700"
                        />
                        <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Oda filtresi
                        </label>
                      </div>
                      <div className="relative md:col-span-2">
                        <input
                          type="text"
                          value={assetFilterText}
                          onChange={(e) => setAssetFilterText(e.target.value)}
                          placeholder=" "
                          className="peer w-full p-4 pt-6 bg-white/70 border border-slate-200/70 rounded-3xl outline-none focus:ring-8 focus:ring-sky-500/10 focus:border-sky-500 font-black text-slate-700"
                        />
                        <label className="pointer-events-none absolute left-5 top-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Arama
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredAssets.map(item => (
                      <div
                        key={item.id}
                        className="group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 card-glass rounded-[2.5rem] transition-all duration-300 tap-scale hover-glow"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-sky-500 opacity-30" />
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-sky-100 text-sky-700 border border-sky-200">
                            📦
                          </div>
                          <div>
                            <div className="text-2xl font-black text-slate-800 tracking-tight">
                              {item.name}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest">
                                {item.room}
                              </span>
                              <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-black uppercase tracking-widest">
                                {formatDateDisplay(item.assignedAt)}
                              </span>
                            </div>
                            {item.note && (
                              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mt-3">
                                {item.note}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteAsset(item.id)}
                          className="p-3 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Sil"
                        >
                          <TrashIcon className="w-6 h-6" />
                        </button>
                      </div>
                    ))}

                    {filteredAssets.length === 0 && (
                      <div className="text-center py-44 card-glass rounded-[4rem] border-2 border-dashed border-slate-200/70">
                        <div className="text-8xl mb-8 opacity-60 float-slow">🧰</div>
                        <h3 className="text-3xl font-black text-slate-700 tracking-tighter">STOK YOK</h3>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
                          İlk stok kaydını ekleyin.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* Mobile Tab Bar (no sidebar) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
              <div className="tabbar rounded-[2.25rem] px-4 py-3">
                <div className="grid grid-cols-5 items-center">
                  <button
                    onClick={() => setActiveSection('home')}
                    className={`tabbar-item ${activeSection === 'home' ? 'active' : ''} flex flex-col items-center justify-center gap-1 py-2 tap-scale`}
                  >
                    <div className={`text-xl ${activeSection === 'home' ? 'text-indigo-600' : 'text-slate-500'}`}>✨</div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${activeSection === 'home' ? 'text-indigo-700' : 'text-slate-500'}`}>Anasayfa</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('tasks');
                      setActiveCategoryId(null); // "Tüm Görevler" görünümü
                    }}
                    className={`tabbar-item ${activeSection === 'tasks' ? 'active' : ''} flex flex-col items-center justify-center gap-1 py-2 tap-scale`}
                  >
                    <div className={`text-xl ${activeSection === 'tasks' ? 'text-indigo-600' : 'text-slate-500'}`}>📝</div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${activeSection === 'tasks' ? 'text-indigo-700' : 'text-slate-500'}`}>Görevler</div>
                  </button>

                  {/* Context FAB */}
                  <div className="relative flex items-center justify-center">
                    <button
                      onClick={() => {
                        if (activeSection === 'rentals') {
                          setIsRentalModalOpen(true);
                          return;
                        }
                        if (activeSection === 'assets') {
                          setIsAssetModalOpen(true);
                          return;
                        }
                        if (activeSection === 'tasks') {
                          openCreateTaskModal(activeCategoryId);
                          return;
                        }
                        // home
                        if (!activeCategoryId && categories.length) {
                          setActiveSection('tasks');
                          setActiveCategoryId(categories[0].id);
                          openCreateTaskModal(categories[0].id);
                          return;
                        }
                        if (!categories.length) {
                          setIsCategoryModalOpen(true);
                          return;
                        }
                        setActiveSection('tasks');
                        openCreateTaskModal(activeCategoryId || categories[0]?.id || null);
                      }}
                      className="relative fab fab-pulse w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-2xl -mt-8 shadow-xl"
                      aria-label="Add"
                      title="Ekle"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveSection('rentals')}
                    className={`tabbar-item ${activeSection === 'rentals' ? 'active' : ''} flex flex-col items-center justify-center gap-1 py-2 tap-scale`}
                  >
                    <div className={`text-xl ${activeSection === 'rentals' ? 'text-emerald-600' : 'text-slate-500'}`}>🏠</div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${activeSection === 'rentals' ? 'text-emerald-700' : 'text-slate-500'}`}>Kiralar</div>
                  </button>

                  <button
                    onClick={() => setActiveSection('assets')}
                    className={`tabbar-item ${activeSection === 'assets' ? 'active' : ''} flex flex-col items-center justify-center gap-1 py-2 tap-scale`}
                  >
                    <div className={`text-xl ${activeSection === 'assets' ? 'text-sky-600' : 'text-slate-500'}`}>🧰</div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${activeSection === 'assets' ? 'text-sky-700' : 'text-slate-500'}`}>Stok</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Create Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[160] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-md p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-4xl font-black mb-10 tracking-tighter text-slate-800">
              {editingCategoryId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
            </h3>
            <div className="space-y-10">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Kategori Adı</label>
                <input
                  type="text"
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Örn: Mutfak İşleri"
                  className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-2xl transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">İkon</label>
                <div className="grid grid-cols-5 gap-4">
                  {CATEGORY_ICONS.map(i => (
                    <button
                      key={i}
                      onClick={() => setNewCategoryIcon(i)}
                      className={`text-4xl p-4 rounded-3xl border-2 transition-all duration-300 ${newCategoryIcon === i ? 'border-indigo-500 bg-indigo-50 scale-110 shadow-xl shadow-indigo-100' : 'border-slate-50 hover:bg-slate-50'}`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Renk</label>
                <div className="grid grid-cols-4 gap-4">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`h-12 rounded-2xl transition-all duration-300 ${color} ${newCategoryColor === color ? 'ring-8 ring-offset-4 ring-indigo-500/20 scale-105' : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-6 pt-6">
                <button onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-6 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-[10px] tracking-widest">Vazgeç</button>
                <button
                  onClick={handleSaveCategory}
                  className="flex-[2] py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                >
                  {editingCategoryId ? 'Kaydet' : 'Kategori Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rental Create Modal */}
      {isRentalModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-md p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-4xl font-black mb-10 tracking-tighter text-slate-800">Yeni Kira</h3>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Daire Numarası</label>
                <input
                  type="text"
                  value={newRentalUnit}
                  onChange={(e) => setNewRentalUnit(e.target.value)}
                  placeholder="Örn: 5B"
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">İsim Soyisim</label>
                <input
                  type="text"
                  value={newRentalName}
                  onChange={(e) => setNewRentalName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-slate-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Kira Günü</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newRentalDueDay}
                    onChange={(e) => setNewRentalDueDay(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Kira Tutarı</label>
                  <input
                    type="text"
                    value={newRentalAmount}
                    onChange={(e) => setNewRentalAmount(e.target.value)}
                    placeholder="Örn: 9500"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-slate-600"
                  />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <button
                  onClick={() => setIsRentalModalOpen(false)}
                  className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-[10px] tracking-widest"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleAddRental}
                  className="flex-[2] py-5 bg-emerald-500 text-white rounded-[2rem] font-black shadow-2xl hover:bg-emerald-600 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                >
                  Kira Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Create Modal */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-md p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-4xl font-black mb-10 tracking-tighter text-slate-800">Yeni Stok</h3>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Ürün Adı</label>
                <input
                  type="text"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="Örn: Televizyon"
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-sky-500/10 focus:border-sky-600 font-bold text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Hangi Oda</label>
                <input
                  type="text"
                  value={newAssetRoom}
                  onChange={(e) => setNewAssetRoom(e.target.value)}
                  placeholder="Örn: Salon"
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-sky-500/10 focus:border-sky-600 font-bold text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Ne Zaman Verildi</label>
                <input
                  type="date"
                  value={newAssetDate}
                  onChange={(e) => setNewAssetDate(e.target.value)}
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-sky-500/10 focus:border-sky-600 font-bold text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Açıklama</label>
                <textarea
                  value={newAssetNote}
                  onChange={(e) => setNewAssetNote(e.target.value)}
                  placeholder="Ek notlar..."
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-sky-500/10 focus:border-sky-600 font-bold text-slate-600 min-h-[120px]"
                />
              </div>
              <div className="flex gap-6 pt-2">
                <button
                  onClick={() => setIsAssetModalOpen(false)}
                  className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-[10px] tracking-widest"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleAddAsset}
                  className="flex-[2] py-5 bg-sky-500 text-white rounded-[2rem] font-black shadow-2xl hover:bg-sky-600 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                >
                  Stok Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Create Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-2xl p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <h3 className="text-4xl font-black tracking-tighter text-slate-800">
                {editingTaskId ? 'Görevi Düzenle' : 'Yeni Görev'}
              </h3>
            </div>

            <div className="space-y-10">
              {/* Category picker + manage */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Seç</label>
                  <button
                    type="button"
                    onClick={openCreateCategoryModal}
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-white/70 border border-slate-200/70 text-slate-600 hover:bg-white tap-scale"
                  >
                    + Kategori
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {categories.map((cat) => {
                    const isSelected = (selectedTaskCategoryId || activeCategoryId) === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedTaskCategoryId(cat.id);
                          setActiveCategoryId(cat.id);
                        }}
                        className={`relative overflow-hidden aspect-square rounded-3xl border transition-all tap-scale hover-glow ${isSelected ? 'active-pill border-indigo-200' : 'bg-white/70 border-slate-200/70'
                          }`}
                        title={cat.name}
                      >
                        <div className={`absolute inset-0 ${cat.color} opacity-10`} />
                        <div className="absolute left-0 top-0 bottom-0 w-2 opacity-60" />

                        <div className="relative h-full w-full p-3 flex flex-col items-center justify-center gap-1">
                          <div className="text-[22px] leading-none">{cat.icon}</div>
                          <div className="w-full text-[9px] font-black uppercase tracking-widest text-slate-700 text-center truncate whitespace-nowrap">
                            {cat.name}
                          </div>
                        </div>

                        {/* edit/delete controls */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 md:group-hover:opacity-100">
                          <span className="sr-only">Kategori işlemleri</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEditCategoryModal(cat.id); }}
                          className="absolute top-2 left-2 w-8 h-8 rounded-2xl bg-white/80 border border-slate-200/70 text-slate-700 hover:bg-white transition-all"
                          title="Düzenle"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteCategoryById(cat.id); }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-2xl bg-white/80 border border-slate-200/70 text-rose-600 hover:bg-rose-50 transition-all"
                          title="Sil"
                        >
                          🗑
                        </button>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Görev Nedir?</label>
                <input
                  type="text"
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Yapılacak işi yazın..."
                  className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-black text-3xl transition-all shadow-inner"
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Görevi Kim Ekledi</label>
                  <div className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600">
                    {currentUser?.name || 'Bilinmiyor'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Görevi Kim Yapacak</label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.role === 'admin' ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Beklenen Süre</label>
                  <input
                    type="time"
                    value={newTaskExpectedDuration}
                    onChange={(e) => setNewTaskExpectedDuration(e.target.value)}
                    step="60"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Tekrar</label>
                  <select
                    value={newTaskRepeat}
                    onChange={(e) => setNewTaskRepeat(e.target.value as 'once' | 'daily')}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                  >
                    <option value="once">Tek Seferlik</option>
                    <option value="daily">Her Gün</option>
                  </select>
                </div>
                {!isAuditCategory && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Fotoğraf Gerekli mi?</label>
                    <button
                      type="button"
                      onClick={() => setNewTaskRequiresPhoto(prev => !prev)}
                      className={`w-full p-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${newTaskRequiresPhoto ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {newTaskRequiresPhoto ? 'Evet, fotoğraf zorunlu' : 'Hayır, gerekmez'}
                    </button>
                  </div>
                )}
              </div>

              {isAuditCategory && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Denetim Seçenekleri</label>
                    <button
                      type="button"
                      onClick={toggleSelectAllAudit}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                    >
                      {selectedAuditOptions.length === auditOptions.length && auditOptions.length > 0 ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {auditOptions.map(option => (
                      <div key={option} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <label className="flex items-center gap-3 font-bold text-slate-600">
                          <input
                            type="checkbox"
                            checked={selectedAuditOptions.includes(option)}
                            onChange={() => toggleAuditOption(option)}
                          />
                          {option}
                        </label>
                        <button
                          type="button"
                          onClick={() => removeAuditOption(option)}
                          className="text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
                        >
                          Sil
                        </button>
                      </div>
                    ))}
                    {auditOptions.length === 0 && (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold">
                        Henüz denetim seçeneği yok. Aşağıdan ekleyin.
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newAuditOption}
                      onChange={(e) => setNewAuditOption(e.target.value)}
                      placeholder="Örn: Televizyon üstü"
                      className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddAuditOption}
                      className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-6 pt-6">
                <button
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setEditingTaskId(null);
                    resetTaskModalState();
                  }}
                  className="flex-1 py-6 font-black text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => handleAddTask()}
                  className="flex-[2] py-6 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-slate-800 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                >
                  {editingTaskId ? 'Kaydet' : 'Listeye Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-2xl p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-indigo-100 text-indigo-600 text-3xl">
                👥
              </div>
              <div className="flex-1">
                <h3 className="text-4xl font-black tracking-tighter text-slate-800">Kullanıcı Yönetimi</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">
                  {currentUser?.role === 'admin' ? 'Admin yetkisi aktif' : 'Sadece admin düzenleyebilir'}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mevcut Kullanıcılar</p>
                <div className="space-y-3">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700">{user.name} {user.role === 'admin' ? '(Admin)' : ''}</span>
                        <span className="text-xs font-bold text-slate-400">
                          @{user.username} · {user.phoneNumber || 'Telefon yok'}
                        </span>
                      </div>
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <div className="border-t border-slate-100 pt-8 space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yeni Kullanıcı Ekle</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="İsim"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                    />
                    <input
                      type="text"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      placeholder="Kullanıcı adı"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                    />
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Şifre"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                    />
                    <input
                      type="text"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="Telefon (WhatsApp)"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                    />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
                    >
                      <option value="user">Kullanıcı</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={handleAddUser}
                      className="p-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      Kullanıcı Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-8 border-t border-slate-100 mt-8">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-12 py-6 font-black text-slate-600 hover:text-slate-800 uppercase text-xs tracking-widest transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Settings Modal */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-2xl p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
              <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center ${whatsAppReady ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <svg className={`w-10 h-10 ${whatsAppReady ? 'text-emerald-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-4xl font-black tracking-tighter text-slate-800">WhatsApp Bildirimleri</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">
                  {whatsAppReady ? '✅ Bağlı ve Hazır' : whatsAppEnabled ? '⏳ Bağlanıyor...' : '❌ Bağlı Değil'}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Telefon Numaraları */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                  Bildirim Gönderilecek Numaralar
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ana numara"
                    className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-xl transition-all shadow-inner"
                  />
                  <input
                    type="text"
                    value={secondPhoneNumber}
                    onChange={(e) => setSecondPhoneNumber(e.target.value)}
                    placeholder="2. numara (opsiyonel)"
                    className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-xl transition-all shadow-inner"
                  />
                </div>
                <button
                  onClick={handlePhoneNumberSave}
                  className="px-8 py-6 bg-indigo-600 text-white rounded-[2rem] font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-lg text-sm"
                >
                  Kaydet
                </button>
                <p className="text-xs text-slate-400 mt-3 px-2">
                  📱 Tamamlanan görevler bu numaralara bildirim olarak gönderilecek
                </p>
              </div>

              {/* Bağlantı Durumu */}
              <div className="border-t border-slate-100 pt-8">
                {!whatsAppEnabled ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-6">📱</div>
                    <p className="text-slate-600 font-bold mb-8">
                      WhatsApp hesabınızı bağlayarak görev tamamlama bildirimlerini alabilirsiniz
                    </p>
                    <button
                      onClick={handleWhatsAppInitialize}
                      className="px-12 py-6 bg-emerald-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all uppercase text-sm tracking-widest"
                    >
                      WhatsApp'ı Başlat
                    </button>
                  </div>
                ) : !whatsAppReady && qrCode ? (
                  <div className="text-center py-8">
                    <p className="text-slate-700 font-bold text-lg mb-6">
                      📲 QR Kodu WhatsApp ile Tarayın
                    </p>
                    <div className="flex justify-center mb-6">
                      <img
                        src={qrCode}
                        alt="QR Code"
                        className="w-64 h-64 border-8 border-slate-100 rounded-[3rem] shadow-2xl"
                      />
                    </div>
                    <p className="text-slate-500 text-sm mb-6">
                      1. WhatsApp'ı açın<br />
                      2. Menü &gt; Bağlı Cihazlar &gt; Cihaz Bağla<br />
                      3. Bu QR kodu telefonunuzla tarayın
                    </p>
                    <button
                      onClick={handleWhatsAppDisconnect}
                      className="px-8 py-4 bg-rose-100 text-rose-600 rounded-[2rem] font-black hover:bg-rose-200 active:scale-95 transition-all text-sm"
                    >
                      İptal Et
                    </button>
                  </div>
                ) : whatsAppReady ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-6">✅</div>
                    <p className="text-emerald-600 font-black text-2xl mb-4">
                      WhatsApp Bağlı!
                    </p>
                    <p className="text-slate-600 font-bold mb-8">
                      Artık görevlerinizi tamamladığınızda otomatik olarak bildirim alacaksınız
                    </p>
                    <button
                      onClick={handleWhatsAppDisconnect}
                      className="px-8 py-4 bg-rose-100 text-rose-600 rounded-[2rem] font-black hover:bg-rose-200 active:scale-95 transition-all text-sm"
                    >
                      Bağlantıyı Kes
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-6 animate-pulse">⏳</div>
                    <p className="text-slate-600 font-bold">
                      WhatsApp bağlantısı kuruluyor...
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-8 border-t border-slate-100 mt-8">
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="px-12 py-6 font-black text-slate-600 hover:text-slate-800 uppercase text-xs tracking-widest transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Task Modal */}
      {isAuditModalOpen && activeAuditTask && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-3xl p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-sky-100 text-sky-600 text-3xl">
                🧾
              </div>
              <div className="flex-1">
                <h3 className="text-4xl font-black tracking-tighter text-slate-800">Denetim Görevi</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">
                  {activeAuditTask.title}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">
                  Adım {auditStepIndex + 1} / {activeAuditTask.auditItems?.length || 0}
                </p>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {activeAuditTask.auditItems?.[auditStepIndex] || 'Seçenek yok'}
                </p>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-slate-700 text-2xl font-black tracking-tight">
                {activeAuditTask.auditItems?.[auditStepIndex] || 'Denetim seçeneği bulunamadı.'}
              </div>

              <div className="flex items-center gap-6">
                <button
                  onClick={() => handleAuditDecision('pass')}
                  className="flex-1 py-6 bg-emerald-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all uppercase text-sm tracking-widest"
                >
                  + Uygun
                </button>
                <button
                  onClick={() => handleAuditDecision('fail')}
                  className="flex-1 py-6 bg-rose-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-rose-700 active:scale-95 transition-all uppercase text-sm tracking-widest"
                >
                  - Uygun Değil
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Uygun değilse fotoğraf yükleyin
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAuditPhotoChange}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600"
                />
                {auditPhotoDataUrl && (
                  <img
                    src={auditPhotoDataUrl}
                    alt="Denetim Fotoğrafı"
                    className="w-full max-h-80 object-contain rounded-2xl border border-slate-100"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-center pt-8 border-t border-slate-100 mt-8">
              <button
                onClick={() => {
                  setIsAuditModalOpen(false);
                  setActiveAuditTaskId(null);
                  setAuditStepIndex(0);
                  setAuditPhotoDataUrl(null);
                }}
                className="px-12 py-6 font-black text-slate-600 hover:text-slate-800 uppercase text-xs tracking-widest transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Review Modal */}
      {isAuditReviewOpen && activeAuditReviewTask && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-3xl p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-rose-100 text-rose-600 text-3xl">
                📷
              </div>
              <div className="flex-1">
                <h3 className="text-4xl font-black tracking-tighter text-slate-800">Eksik Fotoğrafları</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">
                  {activeAuditReviewTask.title}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {activeAuditReviewTask.auditResults?.filter(result => result.status === 'fail').map((result, idx) => (
                <div key={`${result.item}-${idx}`} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
                  <p className="text-lg font-black text-slate-700">{result.item}</p>
                  {result.photoDataUrl ? (
                    <img
                      src={result.photoDataUrl}
                      alt={`Eksik fotoğraf - ${result.item}`}
                      className="w-full max-h-96 object-contain rounded-2xl border border-slate-100"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-400">Fotoğraf yok</p>
                  )}
                </div>
              ))}
              {(!activeAuditReviewTask.auditResults || activeAuditReviewTask.auditResults.filter(result => result.status === 'fail').length === 0) && (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-bold text-sm">
                  Eksik fotoğraf bulunamadı.
                </div>
              )}
            </div>

            <div className="flex justify-center pt-8 border-t border-slate-100 mt-8">
              <button
                onClick={() => {
                  setIsAuditReviewOpen(false);
                  setActiveAuditReviewTaskId(null);
                }}
                className="px-12 py-6 font-black text-slate-600 hover:text-slate-800 uppercase text-xs tracking-widest transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[120] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-md p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-indigo-100 text-indigo-600 text-3xl">
                🔐
              </div>
              <div className="flex-1">
                <h3 className="text-4xl font-black tracking-tighter text-slate-800">Giriş Yap</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">Kullanıcı adı ve şifre</p>
              </div>
            </div>

            <div className="space-y-6">
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Kullanıcı adı"
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Şifre"
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-slate-600"
              />
              <button
                onClick={handleLogin}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-slate-800 active:scale-95 transition-all uppercase text-xs tracking-widest"
              >
                Giriş Yap
              </button>
            </div>

            <div className="mt-8 text-xs font-bold text-slate-400">
              Varsayılan admin: <span className="font-black text-slate-600">admin / admin123</span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Photo Modal */}
      {isCompletionPhotoModalOpen && (
        <div className="fixed inset-0 modal-overlay z-[110] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="modal-shell w-full md:max-w-2xl p-8 md:p-12 animate-sheet-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-indigo-100 text-indigo-600 text-3xl">
                📸
              </div>
              <div className="flex-1">
                <h3 className="text-4xl font-black tracking-tighter text-slate-800">Tamamlama Fotoğrafı</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">Görev tamamlamak için fotoğraf yükleyin</p>
              </div>
            </div>

            <div className="space-y-6">
              <input
                type="file"
                accept="image/*"
                onChange={handleCompletionPhotoChange}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600"
              />
              {completionPhotoDataUrl && (
                <img
                  src={completionPhotoDataUrl}
                  alt="Tamamlama Fotoğrafı"
                  className="w-full max-h-96 object-contain rounded-2xl border border-slate-100"
                />
              )}
            </div>

            <div className="flex gap-6 pt-8">
              <button
                onClick={() => {
                  setIsCompletionPhotoModalOpen(false);
                  setActiveCompletionPhotoTaskId(null);
                  setCompletionPhotoDataUrl(null);
                }}
                className="flex-1 py-5 font-black text-slate-500 hover:text-slate-700 uppercase text-xs tracking-widest"
              >
                Vazgeç
              </button>
              <button
                onClick={async () => {
                  if (!completionPhotoDataUrl || !activeCompletionPhotoTaskId) {
                    alert('Lütfen fotoğraf yükleyin.');
                    return;
                  }
                  const task = tasks.find(t => t.id === activeCompletionPhotoTaskId);
                  if (!task) return;
                  const today = new Date().toISOString().slice(0, 10);
                  setTasks(prev => prev.map(t => {
                    if (t.id !== activeCompletionPhotoTaskId) return t;
                    if (t.repeat === 'daily') {
                      return {
                        ...t,
                        isCompleted: true,
                        lastCompletedDate: today,
                        completionPhotoDataUrl
                      };
                    }
                    return { ...t, isCompleted: true, completionPhotoDataUrl };
                  }));

                  if (whatsAppEnabled || whatsAppReady) {
                    const category = categories.find(c => c.id === task.categoryId);
                    const message = `✅ Görev Tamamlandı!\n\n📝 ${task.title}\n📁 Kategori: ${category?.name || 'Bilinmiyor'}\n⏰ ${new Date().toLocaleString('tr-TR')}`;
                    try {
                      await sendNotificationMessage(message);
                    } catch (error) {
                      console.error('WhatsApp mesaj hatası:', error);
                    }
                  }

                  setIsCompletionPhotoModalOpen(false);
                  setActiveCompletionPhotoTaskId(null);
                  setCompletionPhotoDataUrl(null);
                }}
                className="flex-[2] py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-slate-800 active:scale-95 transition-all uppercase text-xs tracking-widest"
              >
                Fotoğrafı Kaydet ve Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Popup */}
      {successNotification.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto animate-bounce-in">
            <div className="relative overflow-hidden bg-white rounded-[2.5rem] shadow-2xl border-2 border-emerald-200 max-w-md w-full">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 opacity-80" />

              {/* Success icon with pulse animation */}
              <div className="relative p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-200 animate-pulse-slow">
                  <span className="text-4xl">{successNotification.icon}</span>
                </div>

                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
                  Başarılı!
                </h3>

                <p className="text-slate-600 font-bold whitespace-pre-line leading-relaxed">
                  {successNotification.message}
                </p>

                {/* Close button */}
                <button
                  onClick={() => setSuccessNotification({ show: false, message: '', icon: '' })}
                  className="mt-8 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-[1.5rem] font-black shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all uppercase text-xs tracking-widest"
                >
                  Tamam
                </button>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-emerald-200/30 blur-2xl" />
              <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full bg-emerald-300/20 blur-3xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
