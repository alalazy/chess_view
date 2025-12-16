import joplin from 'api';

import en from './locales/en.json';
import zh_CN from './locales/zh_CN.json';

// language map
const locales: { [key: string]: any } = {
    'en': en,
    'en_US': en,
    'en_GB': en,
    'zh_CN': zh_CN,
    'zh_TW': zh_CN,
};

const DEFAULT_LOCALE = 'en';

class I18n {
    private currentLocale: string = DEFAULT_LOCALE;
    private translations: any = en;

    async init(): Promise<void> {
        try {
            const localeSettings = await joplin.settings.globalValue('locale');
            this.setLocale(localeSettings);
        } catch (error) {
            console.error('Failed to load locale from Joplin settings:', error);
            this.setLocale(DEFAULT_LOCALE);
        }
    }

    setLocale(locale: string): void {
        if (locales[locale]) {
            this.currentLocale = locale;
            this.translations = locales[locale];
        } else {
            // 如果找不到精确匹配，尝试匹配语言前缀（如 zh_CN -> zh）
            const langPrefix = locale.split('_')[0];
            const matchedLocale = Object.keys(locales).find(key => key.startsWith(langPrefix));
            
            if (matchedLocale) {
                this.currentLocale = matchedLocale;
                this.translations = locales[matchedLocale];
            } else {
                console.warn(`Locale '${locale}' not found, using default locale '${DEFAULT_LOCALE}'`);
                this.currentLocale = DEFAULT_LOCALE;
                this.translations = locales[DEFAULT_LOCALE];
            }
        }
    }

    t(key: string, defaultValue?: string): string {
        const value = this.translations[key];
        if (value !== undefined) {
            return value;
        }
        
        // 如果找不到翻译，返回默认值或键名
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        
        console.warn(`Translation key '${key}' not found for locale '${this.currentLocale}'`);
        return key;
    }

    getCurrentLocale(): string {
        return this.currentLocale;
    }
}

export const i18n = new I18n();

export const t = (key: string, defaultValue?: string): string => {
    return i18n.t(key, defaultValue);
};
