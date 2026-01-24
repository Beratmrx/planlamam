const BACKEND_URL = 'http://localhost:3001';

export interface WhatsAppStatus {
  ready: boolean;
  qrCode: string | null;
  hasClient: boolean;
}

export const initializeWhatsApp = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error('WhatsApp başlatma hatası:', error);
    return { success: false, message: 'Backend bağlantısı kurulamadı' };
  }
};

export const getWhatsAppStatus = async (): Promise<WhatsAppStatus> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/status`);
    return await response.json();
  } catch (error) {
    console.error('WhatsApp durum kontrolü hatası:', error);
    return { ready: false, qrCode: null, hasClient: false };
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

