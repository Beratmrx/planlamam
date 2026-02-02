// NOT: .env sadece server.js'ten yüklenir (backend/.env). Burada dotenv/config kullanılmaz;
// aksi halde CWD'deki .env token'ı ezebilir ve 190 hatasına yol açar.
import axios from 'axios';

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';
const WHATSAPP_API_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

class WhatsAppCloudAPI {
    constructor() {
        this.phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
        this.accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
        this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'planla_webhook_token_2024';

        if (!this.phoneNumberId || !this.accessToken) {
            console.warn('⚠️ WhatsApp Cloud API credentials eksik! WHATSAPP_PHONE_NUMBER_ID ve WHATSAPP_ACCESS_TOKEN environment variables\'ı ayarlayın.');
        }
    }

    /**
     * API durumunu kontrol et
     */
    async checkStatus() {
        if (!this.phoneNumberId || !this.accessToken) {
            return {
                ready: false,
                message: 'WhatsApp Cloud API credentials eksik',
                hasCredentials: false
            };
        }

        try {
            // Phone number bilgilerini al (Meta dokümantasyonu: fields parametresi ile iste)
            const url = `${WHATSAPP_API_BASE_URL}/${this.phoneNumberId}?fields=display_phone_number,verified_name`;
            // Debug: hangi token kullanıldığını doğrula (tam değer loglanmaz)
            const tokenPreview = this.accessToken.length
                ? `${this.accessToken.slice(0, 6)}...${this.accessToken.slice(-4)} (len=${this.accessToken.length})`
                : '(boş)';
            console.log('🔍 WhatsApp status isteği:', url, '| token:', tokenPreview);
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            return {
                ready: true,
                message: 'WhatsApp Cloud API bağlantısı aktif',
                hasCredentials: true,
                phoneNumber: response.data.display_phone_number,
                verifiedName: response.data.verified_name
            };
        } catch (error) {
            const errData = error.response?.data?.error;
            const errMsg = errData?.message || error.message;
            const errCode = errData?.code;
            const errSubcode = errData?.error_subcode;

            // error_subcode 463 = token süresi dolmuş; 460 = şifre değişti vb.
            console.error('❌ WhatsApp Cloud API status hatası:', {
                code: errCode,
                subcode: errSubcode,
                message: errMsg,
                fbtrace_id: error.response?.data?.error?.fbtrace_id,
                full: error.response?.data
            });

            let userMessage = errMsg;
            if (errCode === 190) {
                userMessage = 'Access token süresi dolmuş veya geçersiz. Meta Developer Console\'dan yeni kalıcı token oluşturun.';
            } else if (errCode === 100) {
                userMessage = 'Phone Number ID hatalı veya bu uygulamaya ait değil. Meta API Setup\'tan doğru ID alın.';
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                userMessage = 'Meta API\'ye bağlanılamadı (ağ hatası).';
            }

            return {
                ready: false,
                message: 'WhatsApp Cloud API: ' + userMessage,
                hasCredentials: true,
                errorCode: errCode
            };
        }
    }

    /**
     * Mesaj gönder
     * @param {string} phoneNumber - Alıcı telefon numarası (90XXXXXXXXXX formatında)
     * @param {string} message - Gönderilecek mesaj
     */
    async sendMessage(phoneNumber, message) {
        if (!this.phoneNumberId || !this.accessToken) {
            throw new Error('WhatsApp Cloud API credentials eksik');
        }

        // Telefon numarasını formatla
        let formattedNumber = phoneNumber.replace(/\D/g, '');

        // 0 ile başlıyorsa kaldır
        if (formattedNumber.startsWith('0')) {
            formattedNumber = formattedNumber.substring(1);
        }

        // 90 ile başlamıyorsa ekle (Türkiye)
        if (!formattedNumber.startsWith('90')) {
            formattedNumber = '90' + formattedNumber;
        }

        console.log('📱 WhatsApp Cloud API mesaj gönderiliyor:', {
            to: formattedNumber,
            messagePreview: message.substring(0, 50)
        });

        try {
            const response = await axios.post(
                `${WHATSAPP_API_BASE_URL}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedNumber,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: message
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ WhatsApp mesajı gönderildi:', response.data);

            return {
                success: true,
                message: 'Mesaj başarıyla gönderildi',
                messageId: response.data.messages[0].id
            };
        } catch (error) {
            console.error('❌ WhatsApp mesaj gönderme hatası:', error.response?.data || error.message);

            const errorMessage = error.response?.data?.error?.message || error.message;
            const errorCode = error.response?.data?.error?.code;

            throw new Error(`WhatsApp mesaj gönderilemedi (${errorCode}): ${errorMessage}`);
        }
    }

    /**
     * Template mesaj gönder
     * @param {string} phoneNumber - Alıcı telefon numarası
     * @param {string} templateName - Template adı
     * @param {string} languageCode - Dil kodu (örn: 'tr', 'en')
     * @param {Array} components - Template parametreleri
     */
    async sendTemplateMessage(phoneNumber, templateName, languageCode = 'tr', components = []) {
        if (!this.phoneNumberId || !this.accessToken) {
            throw new Error('WhatsApp Cloud API credentials eksik');
        }

        // Telefon numarasını formatla
        let formattedNumber = phoneNumber.replace(/\D/g, '');
        if (formattedNumber.startsWith('0')) {
            formattedNumber = formattedNumber.substring(1);
        }
        if (!formattedNumber.startsWith('90')) {
            formattedNumber = '90' + formattedNumber;
        }

        try {
            const response = await axios.post(
                `${WHATSAPP_API_BASE_URL}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: formattedNumber,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: {
                            code: languageCode
                        },
                        components: components
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ WhatsApp template mesajı gönderildi:', response.data);

            return {
                success: true,
                message: 'Template mesajı başarıyla gönderildi',
                messageId: response.data.messages[0].id
            };
        } catch (error) {
            console.error('❌ WhatsApp template mesaj hatası:', error.response?.data || error.message);
            throw new Error(`Template mesaj gönderilemedi: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Webhook doğrulama (Meta tarafından çağrılır)
     */
    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === this.webhookVerifyToken) {
            console.log('✅ Webhook doğrulandı');
            return challenge;
        } else {
            console.error('❌ Webhook doğrulama başarısız');
            return null;
        }
    }

    /**
     * Gelen webhook mesajlarını işle
     */
    async handleWebhook(body) {
        try {
            // WhatsApp webhook payload'ını parse et
            if (body.object !== 'whatsapp_business_account') {
                return { success: false, message: 'Invalid webhook object' };
            }

            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            if (!value) {
                return { success: false, message: 'No value in webhook' };
            }

            // Mesaj varsa işle
            if (value.messages && value.messages.length > 0) {
                const message = value.messages[0];
                const from = message.from; // Gönderen telefon numarası
                const messageBody = message.text?.body || '';
                const messageType = message.type;
                const messageId = message.id;

                console.log('📨 Gelen WhatsApp mesajı:', {
                    from,
                    type: messageType,
                    body: messageBody,
                    messageId
                });

                // Burada gelen mesajı işleyebilirsiniz
                // Örneğin: database'e kaydetme, otomatik yanıt gönderme, vb.

                return {
                    success: true,
                    message: 'Webhook işlendi',
                    data: {
                        from,
                        messageBody,
                        messageType,
                        messageId
                    }
                };
            }

            // Status update varsa işle
            if (value.statuses && value.statuses.length > 0) {
                const status = value.statuses[0];
                console.log('📊 Mesaj durumu güncellendi:', {
                    id: status.id,
                    status: status.status,
                    timestamp: status.timestamp
                });

                return {
                    success: true,
                    message: 'Status update işlendi'
                };
            }

            return { success: true, message: 'Webhook alındı ama işlenecek bir şey yok' };
        } catch (error) {
            console.error('❌ Webhook işleme hatası:', error);
            return { success: false, message: error.message };
        }
    }
}

// Singleton instance
const whatsappCloudAPI = new WhatsAppCloudAPI();

export default whatsappCloudAPI;
