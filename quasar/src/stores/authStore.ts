import { defineStore } from 'pinia'
import { useAccountStore } from './accountStore'

export interface QRResponse {
    code: number;
    message: string;
    ttl: number;
    data: {
        url: string;
        qrcode_key: string;
    };
}

export interface PollResponse {
    code: number;
    message: string;
    data: {
        code: number;
        message: string;
        url?: string;
        refresh_token?: string;
        timestamp?: number;
    };
}

export interface QRCodeState {
    loading: boolean;
    qrCodeUrl: string;
    qrCodeKey: string;
    error: string;
    statusMessage: string;
    remainingTime: number;
    isExpired: boolean;
}

export interface AuthTimers {
    pollTimer: ReturnType<typeof setInterval> | null;
    countdownTimer: ReturnType<typeof setInterval> | null;
}

const QR_CODE_EXPIRY_TIME = 180; // 3 minutes
const POLL_INTERVAL = 2000; // 2 seconds

export const useAuthStore = defineStore('auth', {
    state: (): { qrCodeState: QRCodeState; timers: AuthTimers } => ({
        qrCodeState: {
            loading: false,
            qrCodeUrl: '',
            qrCodeKey: '',
            error: '',
            statusMessage: '等待扫码...',
            remainingTime: QR_CODE_EXPIRY_TIME,
            isExpired: false,
        },
        timers: {
            pollTimer: null,
            countdownTimer: null,
        },
    }),

    getters: {
        isQRCodeValid(): boolean {
            return !this.qrCodeState.isExpired && this.qrCodeState.remainingTime > 0;
        },
        canShowQRCode(): boolean {
            return !this.qrCodeState.loading &&
                !!this.qrCodeState.qrCodeUrl &&
                this.isQRCodeValid;
        },
        isLoading(): boolean {
            return this.qrCodeState.loading;
        },
    },

    actions: {
        // QR Code 生成
        async generateQrCode(): Promise<boolean> {
            this.resetQRCodeState();
            this.qrCodeState.loading = true;

            try {
                const response = await fetch('/bili-passport/x/passport-login/web/qrcode/generate', {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: QRResponse = await response.json();

                if (data.code === 0 && data.data) {
                    this.qrCodeState.qrCodeUrl = data.data.url;
                    this.qrCodeState.qrCodeKey = data.data.qrcode_key;
                    this.qrCodeState.error = '';

                    this.startPolling();
                    this.startCountdown();
                    return true;
                } else {
                    this.qrCodeState.error = data.message || '生成二维码失败';
                    return false;
                }
            } catch (error) {
                this.qrCodeState.error = '网络请求失败，请检查网络连接';
                console.error('Generate QR code error:', error);
                return false;
            } finally {
                this.qrCodeState.loading = false;
            }
        },

        // 轮询登录状态
        async pollLoginStatus(): Promise<void> {
            if (!this.qrCodeState.qrCodeKey || this.qrCodeState.isExpired) {
                return;
            }

            try {
                const response = await fetch(
                    `/bili-passport/x/passport-login/web/qrcode/poll?qrcode_key=${this.qrCodeState.qrCodeKey}`,
                    {
                        method: 'GET',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                    }
                );

                if (!response.ok) {
                    console.error('Poll request failed:', response.status);
                    return;
                }

                const data: PollResponse = await response.json();

                if (data.code === 0 && data.data) {
                    await this.handlePollResponse(data.data);
                } else {
                    console.error('Poll response error:', data);
                }
            } catch (error) {
                console.error('Poll login status error:', error);
            }
        },

        // 处理轮询响应
        async handlePollResponse(pollData: PollResponse['data']): Promise<void> {
            console.log('Poll response received:', pollData);
            switch (pollData.code) {
                case 0: // 登录成功
                    this.qrCodeState.statusMessage = '登录成功！';
                    this.clearTimers();
                    await this.handleLoginSuccess(pollData);
                    break;
                case 86038: // 二维码已失效
                    this.qrCodeState.statusMessage = '二维码已失效，请刷新重试';
                    this.qrCodeState.isExpired = true;
                    this.clearTimers();
                    break;
                case 86090: // 已扫码，等待确认
                    this.qrCodeState.statusMessage = '已扫码，请在手机上确认登录';
                    break;
                case 86101: // 等待扫码
                    this.qrCodeState.statusMessage = '等待扫码...';
                    break;
                default:
                    this.qrCodeState.statusMessage = pollData.message || '未知状态';
            }
        },

        // 处理登录成功 - 委托给 accountStore
        async handleLoginSuccess(loginData: PollResponse['data']): Promise<void> {
            if (!loginData.url || !loginData.refresh_token) {
                console.error('Login success but missing required data');
                this.qrCodeState.error = '登录数据不完整';
                return;
            }

            try {
                const accountStore = useAccountStore();
                const success = await accountStore.establishSession(
                    loginData.url,
                    loginData.refresh_token
                );
                if (!success) {
                    this.qrCodeState.error = '登录处理失败，请重试';
                }
            } catch (error) {
                console.error('Error handling login success:', error);
                this.qrCodeState.error = '登录处理异常';
            }
        },

        // 定时器管理
        startPolling(): void {
            this.clearTimers();
            // 立即执行一次
            this.pollLoginStatus();
            // 然后开始定时轮询
            this.timers.pollTimer = setInterval(() => {
                this.pollLoginStatus();
            }, POLL_INTERVAL);
        },

        startCountdown(): void {
            this.timers.countdownTimer = setInterval(() => {
                this.qrCodeState.remainingTime--;
                if (this.qrCodeState.remainingTime <= 0) {
                    this.qrCodeState.statusMessage = '二维码已过期，请刷新重试';
                    this.qrCodeState.isExpired = true;
                    this.clearTimers();
                }
            }, 1000);
        },

        clearTimers(): void {
            if (this.timers.pollTimer) {
                clearInterval(this.timers.pollTimer);
                this.timers.pollTimer = null;
            }
            if (this.timers.countdownTimer) {
                clearInterval(this.timers.countdownTimer);
                this.timers.countdownTimer = null;
            }
        },

        // 状态管理
        resetQRCodeState(): void {
            this.clearTimers();
            this.qrCodeState = {
                loading: false,
                qrCodeUrl: '',
                qrCodeKey: '',
                error: '',
                statusMessage: '等待扫码...',
                remainingTime: QR_CODE_EXPIRY_TIME,
                isExpired: false,
            };
        },

        setError(error: string): void {
            this.qrCodeState.error = error;
        },

        // 清理资源
        cleanup(): void {
            this.clearTimers();
            this.resetQRCodeState();
        },
    },
});