import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_FILE = path.join(__dirname, 'storage.json');

// Default empty storage
const DEFAULT_STORAGE = {
  version: 1,
  savedAt: 0,
  users: [],
  categories: [],
  tasks: [],
  rentals: [],
  assets: [],
  whatsAppEnabled: false,
  phoneNumber: '',
  secondPhoneNumber: '',
  auditOptions: []
};

async function ensureStorageFile() {
  try {
    await fs.access(STORAGE_FILE);
  } catch {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(DEFAULT_STORAGE, null, 2), 'utf8');
    console.log('✅ storage.json dosyası oluşturuldu');
  }
}

export async function getStorageFormat() {
  try {
    await ensureStorageFile();
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Storage okuma hatası:', error);
    return DEFAULT_STORAGE;
  }
}

export async function saveStorageFormat(payload) {
  try {
    const now = Date.now();
    const dataToSave = {
      version: 1,
      savedAt: now,
      users: payload?.users || [],
      categories: payload?.categories || [],
      tasks: payload?.tasks || [],
      rentals: payload?.rentals || [],
      assets: payload?.assets || [],
      whatsAppEnabled: Boolean(payload?.whatsAppEnabled),
      phoneNumber: payload?.phoneNumber || '',
      secondPhoneNumber: payload?.secondPhoneNumber || '',
      auditOptions: Array.isArray(payload?.auditOptions) ? payload.auditOptions : []
    };

    await fs.writeFile(STORAGE_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log('✅ Storage kaydedildi:', STORAGE_FILE);
    return true;
  } catch (error) {
    console.error('❌ Storage kaydetme hatası:', error);
    return false;
  }
}
