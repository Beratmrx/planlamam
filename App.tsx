
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Category, User } from './types';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from './constants';
import { PlusIcon, TrashIcon, SparklesIcon, CheckIcon } from './components/Icons';
import { getSmartSuggestions } from './services/geminiService';
import { initializeWhatsApp, getWhatsAppStatus, sendWhatsAppMessage } from './services/whatsappService';

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
  
  // UI States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
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
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // WhatsApp States
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppReady, setWhatsAppReady] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('05536789487');

  useEffect(() => {
    const savedUsers = localStorage.getItem('planla_users_v1');
    const savedCurrentUserId = localStorage.getItem('planla_current_user_id');
    const savedCategories = localStorage.getItem('planla_categories_v3');
    const savedTasks = localStorage.getItem('planla_tasks_v3');
    const savedWhatsAppEnabled = localStorage.getItem('planla_whatsapp_enabled');
    const savedPhoneNumber = localStorage.getItem('planla_phone_number');
    const savedAuditOptions = localStorage.getItem('planla_audit_options_v1');

    const defaultAdmin: User = {
      id: 'user-admin',
      name: 'Admin',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      phoneNumber: '05536789487'
    };

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

    let initialCurrentUserId = initialUsers[0]?.id || defaultAdmin.id;
    if (savedCurrentUserId && initialUsers.some(u => u.id === savedCurrentUserId)) {
      initialCurrentUserId = savedCurrentUserId;
    }

    const normalizedUsers = initialUsers.map(user => {
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

    setUsers(normalizedUsers);
    setCurrentUserId(initialCurrentUserId);
    setNewTaskAssigneeId(initialCurrentUserId);
    setIsAuthModalOpen(!initialCurrentUserId);

    if (savedCategories) {
      const parsed = JSON.parse(savedCategories);
      setCategories(parsed);
      if (parsed.length > 0) setActiveCategoryId(parsed[0].id);
    } else {
      setCategories(DEFAULT_CATEGORIES);
      setActiveCategoryId(DEFAULT_CATEGORIES[0].id);
    }

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        const normalizedTasks = parsedTasks.map((task: Task) => ({
          ...task,
          createdByUserId: task.createdByUserId || initialCurrentUserId,
          assignedToUserId: task.assignedToUserId || initialCurrentUserId,
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
        setTasks(normalizedTasks);
      } catch {
        setTasks([]);
      }
    }

    if (savedWhatsAppEnabled) setWhatsAppEnabled(JSON.parse(savedWhatsAppEnabled));
    if (savedPhoneNumber) setPhoneNumber(savedPhoneNumber);
    if (savedAuditOptions) {
      try {
        const parsed = JSON.parse(savedAuditOptions);
        if (Array.isArray(parsed)) setAuditOptions(parsed);
      } catch {
        setAuditOptions([]);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (categories.length > 0) {
      localStorage.setItem('planla_categories_v3', JSON.stringify(categories));
    }
    localStorage.setItem('planla_tasks_v3', JSON.stringify(tasks));
  }, [categories, tasks, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (users.length > 0) {
      localStorage.setItem('planla_users_v1', JSON.stringify(users));
    }
    if (currentUserId) {
      localStorage.setItem('planla_current_user_id', currentUserId);
    }
  }, [users, currentUserId, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('planla_audit_options_v1', JSON.stringify(auditOptions));
  }, [auditOptions, isHydrated]);

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

  // WhatsApp durumunu periyodik kontrol et
  useEffect(() => {
    if (!whatsAppEnabled) return;
    
    const checkStatus = async () => {
      const status = await getWhatsAppStatus();
      setWhatsAppReady(status.ready);
      setQrCode(status.qrCode);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [whatsAppEnabled]);

  const activeCategory = useMemo(() => categories.find(c => c.id === activeCategoryId), [categories, activeCategoryId]);
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId) || null, [users, currentUserId]);
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

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName,
      icon: newCategoryIcon,
      color: newCategoryColor
    };
    setCategories([...categories, newCat]);
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
    setActiveCategoryId(newCat.id);
  };

  const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (categories.length <= 1) return alert("En az bir kategori kalmalıdır.");
    const newCats = categories.filter(c => c.id !== id);
    setCategories(newCats);
    setTasks(tasks.filter(t => t.categoryId !== id));
    if (activeCategoryId === id) setActiveCategoryId(newCats[0].id);
  };

  const handleAddTask = async (titleOverride?: string) => {
    const finalTitle = typeof titleOverride === 'string' ? titleOverride : newTaskTitle;
    const assignedId = newTaskAssigneeId || currentUserId || '';
    const creatorId = currentUserId || assignedId;
    const durationMinutes = parseDurationMinutes(newTaskExpectedDuration.trim());
    if (!finalTitle.trim() || !activeCategoryId || !assignedId || !creatorId || durationMinutes <= 0) {
      alert('Lütfen görev adı, atanan kişi ve beklenen süreyi girin.');
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      categoryId: activeCategoryId,
      title: finalTitle,
      isCompleted: false,
      createdAt: Date.now(),
      createdByUserId: creatorId,
      assignedToUserId: assignedId,
      expectedDuration: newTaskExpectedDuration.trim(),
      expectedDurationMinutes: durationMinutes,
      dueAt: Date.now() + durationMinutes * 60 * 1000,
      repeat: newTaskRepeat,
      auditItems: isAuditCategory ? selectedAuditOptions : [],
      auditResults: [],
      requiresPhoto: !isAuditCategory ? newTaskRequiresPhoto : false,
      completionPhotoDataUrl: undefined
    };

    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskExpectedDuration('01:00');
    setNewTaskRepeat('once');
    setSelectedAuditOptions([]);
    setNewTaskRequiresPhoto(false);
    setIsTaskModalOpen(false);
    setAiSuggestions([]);

    const assignedUser = users.find(u => u.id === assignedId);
    if ((whatsAppEnabled || whatsAppReady) && assignedUser?.phoneNumber) {
      const category = categories.find(c => c.id === activeCategoryId);
      const repeatLabel = newTaskRepeat === 'daily' ? 'Her gün' : 'Tek sefer';
      const durationLabel = newTaskExpectedDuration.trim() || '01:00';
      const message = `📌 Yeni görev atandı!\n\n📝 ${finalTitle}\n📁 Kategori: ${category?.name || 'Bilinmiyor'}\n⏱️ Süre: ${durationLabel}\n🔁 Tekrar: ${repeatLabel}\n\nLütfen görevi tamamlayın.`;
      try {
        await sendWhatsAppMessage(assignedUser.phoneNumber, message);
      } catch (error) {
        console.error('WhatsApp görev atama hatası:', error);
      }
    }
  };

  const handleFetchSuggestions = async () => {
    if (!activeCategory) return;
    setIsAIThinking(true);
    try {
      const suggestions = await getSmartSuggestions(activeCategory.name);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleWhatsAppInitialize = async () => {
    const result = await initializeWhatsApp();
    if (result.success) {
      setWhatsAppEnabled(true);
      localStorage.setItem('planla_whatsapp_enabled', 'true');
    } else {
      alert(result.message);
    }
  };

  const handleWhatsAppDisconnect = () => {
    setWhatsAppEnabled(false);
    setWhatsAppReady(false);
    setQrCode(null);
    localStorage.setItem('planla_whatsapp_enabled', 'false');
  };

  const handlePhoneNumberSave = () => {
    localStorage.setItem('planla_phone_number', phoneNumber);
    alert('Telefon numarası kaydedildi!');
  };

  const handleAddUser = () => {
    if (currentUser?.role !== 'admin') return;
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) return;
    if (users.some(user => user.username === newUserUsername.trim())) {
      alert('Bu kullanıcı adı zaten var.');
      return;
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: newUserName.trim(),
      username: newUserUsername.trim(),
      password: newUserPassword,
      role: newUserRole,
      phoneNumber: newUserPhone.trim() || undefined
    };
    setUsers(prev => [...prev, newUser]);
    setNewUserName('');
    setNewUserRole('user');
    setNewUserPhone('');
    setNewUserUsername('');
    setNewUserPassword('');
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
    setCurrentUserId(matchedUser.id);
    setNewTaskAssigneeId(matchedUser.id);
    setIsAuthModalOpen(false);
    setLoginUsername('');
    setLoginPassword('');
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setIsAuthModalOpen(true);
    localStorage.removeItem('planla_current_user_id');
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
      const targetNumber = phoneNumber.trim() || '05536789487';
      
      try {
        await sendWhatsAppMessage(targetNumber, message);
        console.log('WhatsApp mesajı gönderildi');
      } catch (error) {
        console.error('WhatsApp mesaj hatası:', error);
      }
    }
  };

  const deleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.createdByUserId !== currentUserId) {
      alert('Sadece kendi eklediğin görevi silebilirsin.');
      return;
    }
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-auto md:h-screen sticky top-0 z-30 shadow-sm">
        <div className="p-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
               <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Planla</h1>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-2 rounded-xl">
                  {currentUser ? `${currentUser.name} ${currentUser.role === 'admin' ? '(Admin)' : ''}` : 'Giriş yap'}
                </div>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => setIsUserModalOpen(true)}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                  >
                    Kullanıcılar
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all"
                >
                  Çıkış
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsWhatsAppModalOpen(true)}
            className={`p-2.5 rounded-xl transition-all ${whatsAppReady ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            title="WhatsApp Ayarları"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">GÖREV KATEGORİLERİ</p>
          {categories.map((cat) => (
            <div 
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                activeCategoryId === cat.id 
                ? `${cat.color} text-white shadow-xl translate-x-1` 
                : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{cat.icon}</span>
                <span className="font-bold tracking-tight">{cat.name}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteCategory(cat.id, e)}
                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${activeCategoryId === cat.id ? 'hover:bg-white/20' : 'hover:bg-rose-50 hover:text-rose-500'}`}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest bg-slate-50/50 hover:bg-indigo-50/30"
          >
            <PlusIcon className="w-4 h-4" /> Yeni Kategori
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar">
        {activeCategory ? (
          <div className="max-w-4xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex items-center gap-8">
                <div className={`text-6xl p-8 rounded-[2.5rem] ${activeCategory.color} text-white shadow-2xl shadow-slate-200 transform -rotate-2`}>
                    {activeCategory.icon}
                </div>
                <div>
                   <h2 className="text-5xl font-black text-slate-800 tracking-tighter">{activeCategory.name}</h2>
                   <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                        {taskView === 'active' ? activeTasks.length : taskView === 'completed' ? completedTasks.length : expiredTasks.length} {taskView === 'active' ? 'Aktif Görev' : taskView === 'completed' ? 'Tamamlanan Görev' : 'Yapılmayan Görev'}
                      </p>
                   </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTaskView('active')}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${taskView === 'active' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setTaskView('completed')}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${taskView === 'completed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  Tamamlanan
                </button>
                <button
                  onClick={() => setTaskView('expired')}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${taskView === 'expired' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  Yapılmayan
                </button>
              </div>
              <button 
                onClick={() => { setIsTaskModalOpen(true); setAiSuggestions([]); setSelectedAuditOptions([]); }}
                className="group flex items-center gap-4 px-10 py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-slate-200"
              >
                <PlusIcon className="group-hover:rotate-90 transition-transform w-5 h-5" /> 
                GÖREV EKLE
              </button>
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
                  className={`group flex items-center justify-between p-8 bg-white rounded-[2.5rem] border border-transparent shadow-sm transition-all duration-300 ${task.isCompleted ? 'opacity-30 grayscale' : 'hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1'}`}
                >
                  <div className="flex items-center gap-8 flex-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (!task.isExpired) toggleTask(task.id); }} 
                      disabled={task.isExpired}
                      className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${task.isCompleted ? 'bg-indigo-600 border-indigo-600 text-white rotate-[360deg]' : 'border-slate-100 hover:border-indigo-500 bg-slate-50'}`}
                    >
                      {task.isCompleted && <CheckIcon className="w-8 h-8 stroke-[4px]" />}
                    </button>
                    <div className="flex flex-col gap-2">
                      <span className={`text-2xl font-black text-slate-700 tracking-tight transition-all ${task.isCompleted ? 'line-through opacity-50' : ''}`}>
                        {task.title}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Ekleyen: {users.find(u => u.id === task.createdByUserId)?.name || 'Bilinmiyor'} · Atanan: {users.find(u => u.id === task.assignedToUserId)?.name || 'Bilinmiyor'} · Süre: {task.expectedDuration || '00:00'} · {task.repeat === 'daily' ? 'Her gün' : 'Tek sefer'}
                      </span>
                      {task.auditItems && task.auditItems.length > 0 && (
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          Denetim: {task.auditItems.length} seçenek
                        </span>
                      )}
                      {task.requiresPhoto && (
                        <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">
                          Fotoğraf zorunlu
                        </span>
                      )}
                      {task.completionPhotoDataUrl && (
                        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">
                          Fotoğraf eklendi
                        </span>
                      )}
                      {task.auditResults && task.auditResults.some(result => result.status === 'fail') && (
                        <span className="text-xs font-black text-rose-500 uppercase tracking-widest">
                          Eksikler var (fotoğraflar mevcut)
                        </span>
                      )}
                      {task.dueAt && !task.isCompleted && !task.isExpired && (
                        <span className="text-xs font-black text-amber-500 uppercase tracking-widest">
                          Geri sayım: {formatRemaining(task.dueAt - nowTs)}
                        </span>
                      )}
                      {task.isExpired && (
                        <span className="text-xs font-black text-rose-500 uppercase tracking-widest">
                          Süresi geçti
                        </span>
                      )}
                    </div>
                  </div>
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
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id, e); }}
                    disabled={task.createdByUserId !== currentUserId}
                    className={`p-3 rounded-2xl transition-all opacity-0 group-hover:opacity-100 ${task.createdByUserId !== currentUserId ? 'text-slate-200 cursor-not-allowed' : 'text-slate-200 hover:text-rose-500 hover:bg-rose-50'}`}
                  >
                    <TrashIcon className="w-6 h-6" />
                  </button>
                </div>
              ))}
              {visibleTasks.length === 0 && (
                <div className="text-center py-44 bg-white/40 rounded-[4rem] border-2 border-dashed border-slate-200">
                  <div className="text-8xl mb-8 opacity-40">✨</div>
                  <h3 className="text-3xl font-black text-slate-400 tracking-tighter">
                    {taskView === 'active' ? 'HER ŞEY YOLUNDA!' : taskView === 'completed' ? 'TAMAMLANAN YOK' : 'YAPILMAYAN YOK'}
                  </h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
                    {taskView === 'active' ? 'Bugünlük planların bitti.' : taskView === 'completed' ? 'Henüz tamamlanan görev yok.' : 'Süresi geçen görev yok.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
             <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center mb-8">
                <PlusIcon className="w-12 h-12" />
             </div>
             <p className="text-2xl font-black uppercase tracking-widest opacity-40">Bir Kategori Seçin</p>
          </div>
        )}
      </main>

      {/* Category Create Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] w-full max-w-md p-12 animate-in zoom-in-95 shadow-2xl">
            <h3 className="text-4xl font-black mb-10 tracking-tighter text-slate-800">Yeni Kategori</h3>
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
                <button onClick={handleAddCategory} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all uppercase text-[10px] tracking-widest">Kategori Oluştur</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Create Modal with Gemini AI */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl p-12 animate-in zoom-in-95 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <h3 className="text-4xl font-black tracking-tighter text-slate-800">Yeni Görev</h3>
              <button 
                onClick={handleFetchSuggestions}
                disabled={isAIThinking}
                className="flex items-center gap-3 px-6 py-3.5 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black hover:bg-indigo-100 transition-all disabled:opacity-50 active:scale-95 uppercase tracking-widest shadow-sm border border-indigo-100"
              >
                <SparklesIcon className={`w-5 h-5 ${isAIThinking ? 'animate-spin' : ''}`} />
                {isAIThinking ? 'Düşünüyor...' : 'Gemini Önerisi Al'}
              </button>
            </div>

            {aiSuggestions.length > 0 && (
              <div className="mb-12 animate-in slide-in-from-top-6 duration-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-6">Yapay Zeka Önerileri</p>
                <div className="flex flex-col gap-4">
                  {aiSuggestions.map((suggestion, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleAddTask(suggestion)}
                      className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-left text-lg font-bold text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-between group shadow-sm"
                    >
                      {suggestion}
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 flex items-center justify-center text-indigo-600 transition-all">
                        <PlusIcon className="w-6 h-6" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-10">
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
                <button onClick={() => { setIsTaskModalOpen(false); setAiSuggestions([]); }} className="flex-1 py-6 font-black text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest">Vazgeç</button>
                <button onClick={() => handleAddTask()} className="flex-[2] py-6 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-slate-800 active:scale-95 transition-all uppercase text-[10px] tracking-widest">Listeye Ekle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl p-12 animate-in zoom-in-95 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl p-12 animate-in zoom-in-95 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10">
              <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center ${whatsAppReady ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <svg className={`w-10 h-10 ${whatsAppReady ? 'text-emerald-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
              {/* Telefon Numarası */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                  Bildirim Gönderilecek Numara
                </label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="05536789487"
                    className="flex-1 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-xl transition-all shadow-inner"
                  />
                  <button
                    onClick={handlePhoneNumberSave}
                    className="px-8 py-6 bg-indigo-600 text-white rounded-[2rem] font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-lg text-sm"
                  >
                    Kaydet
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-3 px-2">
                  📱 Tamamlanan görevler bu numaraya bildirim olarak gönderilecek
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
                      1. WhatsApp'ı açın<br/>
                      2. Menü &gt; Bağlı Cihazlar &gt; Cihaz Bağla<br/>
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-3xl p-12 animate-in zoom-in-95 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-3xl p-12 animate-in zoom-in-95 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[120] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-md p-12 animate-in zoom-in-95 shadow-2xl">
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl p-12 animate-in zoom-in-95 shadow-2xl">
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
                    const targetNumber = phoneNumber.trim() || '05536789487';
                    try {
                      await sendWhatsAppMessage(targetNumber, message);
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
    </div>
  );
};

export default App;
