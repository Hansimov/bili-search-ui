import { CookieInfo } from './types';

export class CookieManager {
    // 设置 cookie
    static setCookie(name: string, value: string, days = 365, domain = '', path = '/') {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

        let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=${path}`;

        if (domain) {
            cookieString += `; domain=${domain}`;
        }

        // 设置 SameSite 和 Secure 属性以提高安全性
        cookieString += '; SameSite=Lax';
        if (location.protocol === 'https:') {
            cookieString += '; Secure';
        }

        document.cookie = cookieString;
        console.log(`Cookie set: ${name}=${value.substring(0, 20)}...`);
    }

    // 获取 cookie
    static getCookie(name: string): string | null {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');

        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    }

    // 删除 cookie
    static deleteCookie(name: string, domain = '', path = '/') {
        let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;

        if (domain) {
            cookieString += `; domain=${domain}`;
        }

        document.cookie = cookieString;
        console.log(`Cookie deleted: ${name}`);
    }

    // 获取所有 bili 相关的 cookies
    static getBiliCookies(): CookieInfo | null {
        const cookies = {
            DedeUserID: this.getCookie('DedeUserID') || '',
            DedeUserID__ckMd5: this.getCookie('DedeUserID__ckMd5') || '',
            Expires: this.getCookie('Expires') || '',
            SESSDATA: this.getCookie('SESSDATA') || '',
            bili_jct: this.getCookie('bili_jct') || '',
        };

        // 检查必要的 cookie 是否存在
        if (!cookies.DedeUserID || !cookies.SESSDATA) {
            return null;
        }

        return cookies;
    }

    // 设置所有 bili 相关的 cookies
    static setBiliCookies(cookies: CookieInfo) {
        // 计算过期时间
        let days = 365; // 默认一年
        if (cookies.Expires) {
            try {
                const expiresDate = new Date(parseInt(cookies.Expires) * 1000);
                const now = new Date();
                days = Math.max(1, Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            } catch (error) {
                console.warn('Failed to parse expires date, using default:', error);
            }
        }

        // 设置每个 cookie
        Object.entries(cookies).forEach(([key, value]) => {
            if (value) {
                this.setCookie(key, value, days);
            }
        });
    }

    // 清除所有 bili 相关的 cookies
    static clearBiliCookies() {
        const cookieNames = ['DedeUserID', 'DedeUserID__ckMd5', 'Expires', 'SESSDATA', 'bili_jct'];
        cookieNames.forEach(name => {
            this.deleteCookie(name);
            // 尝试删除可能的域名变体
            this.deleteCookie(name, '.bilibili.com');
            this.deleteCookie(name, 'bilibili.com');
        });
    }

    // 从URL解析cookies
    static parseCookiesFromUrl(url: string): CookieInfo | null {
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);

            const cookies: CookieInfo = {
                DedeUserID: params.get('DedeUserID') || '',
                DedeUserID__ckMd5: params.get('DedeUserID__ckMd5') || '',
                Expires: params.get('Expires') || '',
                SESSDATA: params.get('SESSDATA') || '',
                bili_jct: params.get('bili_jct') || '',
            };

            console.log('Parsed cookies:', {
                DedeUserID: cookies.DedeUserID,
                hasSessionData: !!cookies.SESSDATA,
                hasBiliJct: !!cookies.bili_jct
            });

            if (!cookies.DedeUserID || !cookies.SESSDATA) {
                throw new Error('Missing required cookie fields');
            }

            return cookies;
        } catch (error) {
            console.error('Failed to parse cookies from URL:', error);
            console.error('Original URL:', url);
            return null;
        }
    }

    // 创建认证请求头
    static getAuthHeaders(): HeadersInit {
        const cookies = this.getBiliCookies();

        if (!cookies) {
            return {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            };
        }

        // 构建完整的Cookie字符串
        const cookieString = [
            `SESSDATA=${cookies.SESSDATA}`,
        ].filter(Boolean).join('; ');

        const headers: HeadersInit = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            'Cookie': cookieString,
        };

        console.log('getAuthHeaders():', headers);
        return headers;
    }
}