const ENV_BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;
const inferredHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const INFERRED_BACKEND_URL = `http://${inferredHost}:3002`;
const isLocalEnvUrl = Boolean(ENV_BACKEND_URL && /localhost|127\.0\.0\.1/i.test(ENV_BACKEND_URL));
// Docker container'ında çalışıyorsa (VITE_BACKEND_URL backend içeriyorsa), Nginx reverse proxy kullan (/api)
const isDockerEnv = Boolean(ENV_BACKEND_URL && ENV_BACKEND_URL.includes('backend'));
// Netlify proxy: VITE_BACKEND_URL = site URL ise aynı origin kullan (/api proxy edilir)
const isSameOriginProxy = typeof window !== 'undefined' && ENV_BACKEND_URL && (window.location.origin === ENV_BACKEND_URL.replace(/\/$/, ''));
const BACKEND_URL = isDockerEnv || isSameOriginProxy ? '' : (!ENV_BACKEND_URL || isLocalEnvUrl ? INFERRED_BACKEND_URL : ENV_BACKEND_URL);

export interface WhatsAppStatus {
  ready: boolean;
  message: string;
  hasCredentials: boolean;
  phoneNumber?: string;
  verifiedName?: string;
}

export const initializeWhatsApp = async (): Promise<{ success: boolean; message: string }> => {
  const url = `${BACKEND_URL}/api/whatsapp/initialize`;
  console.log('🔵 initializeWhatsApp çağrıldı, URL:', url);
  console.log('🔵 BACKEND_URL:', BACKEND_URL);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('🔵 Response status:', response.status);
    const data = await response.json();
    console.log('🔵 Response data:', data);
    return data;
  } catch (error) {
    console.error('❌ WhatsApp başlatma hatası:', error);
    return { success: false, message: 'Backend bağlantısı kurulamadı: ' + (error as Error).message };
  }
};

export const getWhatsAppStatus = async (): Promise<WhatsAppStatus> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/status`);
    return await response.json();
  } catch (error) {
    console.error('WhatsApp durum kontrolü hatası:', error);
    return { ready: false, message: 'Bağlantı hatası', hasCredentials: false };
  }
};

export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, message })
    });
    return await response.json();
  } catch (error) {
    console.error('WhatsApp mesaj gönderme hatası:', error);
    return { success: false, message: 'Mesaj gönderilemedi' };
  }
};

export const logoutWhatsApp = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error('WhatsApp logout hatası:', error);
    return { success: false, message: 'Logout işlemi başarısız' };
  }
};
