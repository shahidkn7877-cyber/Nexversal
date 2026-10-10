export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  isRtl?: boolean;
  region?: string;
}

/**
 * Maintained comprehensive registry of world languages.
 * Sorted alphabetically by English name by default.
 */
export const LANGUAGE_REGISTRY: LanguageOption[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية (السعودية)', isRtl: true, region: 'SA' },
  { code: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية (مصر)', isRtl: true, region: 'EG' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (United States)', region: 'US' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (United Kingdom)', region: 'GB' },
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', region: 'AU' },
  { code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)', region: 'CA' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English (India)', region: 'IN' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'fa', name: 'Persian (Farsi)', nativeName: 'فارسی', isRtl: true },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', region: 'CA' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', isRtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', region: 'BR' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', region: 'PT' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', region: 'ES' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', region: 'MX' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'tl', name: 'Tagalog (Filipino)', nativeName: 'Tagalog' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isRtl: true },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
].sort((a, b) => a.name.localeCompare(b.name, 'en'));

/**
 * Retrieves a language option by exact code or falls back to standard match.
 */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toLowerCase();
  return (
    LANGUAGE_REGISTRY.find((l) => l.code.toLowerCase() === normalized) ||
    LANGUAGE_REGISTRY.find((l) => l.code.toLowerCase().startsWith(normalized.split('-')[0]))
  );
}

/**
 * Returns whether a language uses right-to-left script.
 */
export function isRtlLanguage(code: string): boolean {
  const lang = getLanguageByCode(code);
  return Boolean(lang?.isRtl);
}

/**
 * Filters the registry by search query matching English name, native name, or code.
 */
export function filterLanguages(query: string): LanguageOption[] {
  if (!query.trim()) return LANGUAGE_REGISTRY;
  const q = query.trim().toLowerCase();
  return LANGUAGE_REGISTRY.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
  );
}

