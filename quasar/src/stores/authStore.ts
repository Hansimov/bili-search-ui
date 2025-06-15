import { defineStore } from 'pinia'

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

export interface LoginState {
    isLoggedIn: boolean;
    userInfo: UserInfo | null;
    refreshToken: string | null;
}

export interface UserInfo {
    uid: number;
    username: string;
    avatar: string;
    // 根据实际需要添加更多字段
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

export function defaultQRCodeState(): QRCodeState {
    return {
        loading: false,
        qrCodeUrl: '',
        qrCodeKey: '',
        error: '',
        statusMessage: '等待扫码...',
        remainingTime: 180,
        isExpired: false,
    };
}

export function defaultLoginState(): LoginState {
    return {
        isLoggedIn: false,
        userInfo: null,
        refreshToken: localStorage.getItem('bili_refresh_token'),
    };
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        loginState: defaultLoginState(),
        qrCodeState: defaultQRCodeState(),
        pollTimer: null as ReturnType<typeof setInterval> | null,
        countdownTimer: null as ReturnType<typeof setInterval> | null,
    }),

    getters: {
        isLoggedIn(): boolean {
            return this.loginState.isLoggedIn;
        },
        userInfo(): UserInfo | null {
            return this.loginState.userInfo;
        },
        isQRCodeValid(): boolean {
            return !this.qrCodeState.isExpired && this.qrCodeState.remainingTime > 0;
        },
        canShowQRCode(): boolean {
            return !this.qrCodeState.loading && !!this.qrCodeState.qrCodeUrl && this.isQRCodeValid;
        },
    },

    actions: {
        // QR Code 生成
        async generateQrCode() {
            this.qrCodeState.loading = true;
            this.qrCodeState.error = '';
            this.qrCodeState.remainingTime = 180;
            this.qrCodeState.statusMessage = '等待扫码...';
            this.qrCodeState.isExpired = false;

            try {
                const response = await fetch(
                    '/bili-passport/x/passport-login/web/qrcode/generate',
                    {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: QRResponse = await response.json();

                if (data.code === 0 && data.data) {
                    this.qrCodeState.qrCodeUrl = data.data.url;
                    this.qrCodeState.qrCodeKey = data.data.qrcode_key;
                    this.startPolling();
                    this.startCountdown();
                } else {
                    this.qrCodeState.error = data.message || '生成二维码失败';
                }
            } catch (err) {
                this.qrCodeState.error = '网络请求失败，请检查网络连接或尝试刷新';
                console.error('Generate QR code error:', err);
            } finally {
                this.qrCodeState.loading = false;
            }
        },

        // 轮询登录状态
        async pollLoginStatus() {
            if (!this.qrCodeState.qrCodeKey) return;

            try {
                const response = await fetch(
                    `/bili-passport/x/passport-login/web/qrcode/poll?qrcode_key=${this.qrCodeState.qrCodeKey}`,
                    {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    console.error('Poll request failed:', response.status);
                    return;
                }

                const data: PollResponse = await response.json();

                if (data.code === 0 && data.data) {
                    this.handlePollResponse(data.data);
                } else {
                    console.error('Poll response error:', data);
                }
            } catch (err) {
                console.error('Poll login status error:', err);
            }
        },

        // 处理轮询响应
        handlePollResponse(pollData: PollResponse['data']) {
            switch (pollData.code) {
                case 0:
                    this.qrCodeState.statusMessage = '登录成功！';
                    this.clearTimers();
                    this.handleLoginSuccess(pollData);
                    break;
                case 86038:
                    this.qrCodeState.statusMessage = '二维码已失效，请刷新重试';
                    this.qrCodeState.isExpired = true;
                    this.clearTimers();
                    break;
                case 86090:
                    this.qrCodeState.statusMessage = '已扫码，请在手机上确认登录';
                    break;
                case 86101:
                    this.qrCodeState.statusMessage = '等待扫码...';
                    break;
                default:
                    this.qrCodeState.statusMessage = pollData.message || '未知状态';
            }
        },

        // 处理登录成功
        handleLoginSuccess(loginData: PollResponse['data']) {
            console.log('Login successful:', loginData);

            if (loginData.refresh_token) {
                this.loginState.refreshToken = loginData.refresh_token;
                localStorage.setItem('bili_refresh_token', loginData.refresh_token);
            }

            this.loginState.isLoggedIn = true;
            // 这里可以根据需要获取用户信息
            // this.fetchUserInfo();
        },

        // 退出登录
        logout() {
            this.loginState.isLoggedIn = false;
            this.loginState.userInfo = null;
            this.loginState.refreshToken = null;
            localStorage.removeItem('bili_refresh_token');
        },

        // 开始轮询
        startPolling() {
            this.clearTimers();
            this.pollLoginStatus();
            this.pollTimer = setInterval(() => this.pollLoginStatus(), 2000);
        },

        // 开始倒计时
        startCountdown() {
            this.countdownTimer = setInterval(() => {
                this.qrCodeState.remainingTime--;
                if (this.qrCodeState.remainingTime <= 0) {
                    this.qrCodeState.statusMessage = '二维码已过期，请刷新重试';
                    this.qrCodeState.isExpired = true;
                    this.clearTimers();
                }
            }, 1000);
        },

        // 清除定时器
        clearTimers() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
            if (this.countdownTimer) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
            }
        },

        // 重置二维码状态
        resetQRCodeState() {
            this.clearTimers();
            this.qrCodeState = defaultQRCodeState();
        },

        // 设置错误信息
        setError(error: string) {
            this.qrCodeState.error = error;
        },

        // 初始化认证状态（应用启动时调用）
        initAuth() {
            const token = localStorage.getItem('bili_refresh_token');
            if (token) {
                this.loginState.refreshToken = token;
                // 这里可以验证 token 有效性或获取用户信息
                // this.validateToken();
            }
        },
    },
});