
interface I18NOptions {
  defaultLocale: string;
}

export default class I18N {
  private locales: Map<string, I18NLocale> = new Map();
  private strings: Map<string, string> = new Map();
  private default: string;

  constructor ({ defaultLocale }: I18NOptions = { defaultLocale: "en" }) {
    this.default  = "en";

    this.setDefaultLocale(defaultLocale);
  }

  setDefaultLocale (locale: string): void {
    this.default  = locale || "en";
  }

  getDefaultLocale (): string {
    return this.default || "en";
  }

  hasLocale (locale: string): boolean {
    return this.locales.has(locale);
  }

  getLocale (locale?: string): I18NLocale {
    locale = locale || I18N.getClientLocale();

    if(!this.locales.has(locale)) {
      this.locales.set(locale, new I18NLocale({ i18n: this, locale }));
    }

    return this.locales.get(locale);
  }

  setLocaleStrings (locale: string, stringsList: I18NLocaleStrings): void {
    const loc = this.getLocale(locale);

    loc.setStrings(stringsList);
  }

  hasLocaleStrings (locale: string): boolean {
    if(this.hasLocale(locale)) {
      const loc = this.getLocale(locale);

      return loc.hasStrings();
    }

    return false;
  }

  getLocaleStrings (locale: string): Map<string, string> {
    const loc = this.getLocale(locale);

    return loc.getStrings();
  }

  static getClientLocale (): string {
    if(navigator.languages !== undefined) {
      return navigator.languages[0];
    }

    return navigator.language;
  }

  static getClientLanguage (): string {
    return this.parseLocale(this.getClientLocale()).language;
  }

  static getClientCountry (): string {
    return this.parseLocale(this.getClientLocale()).country;
  }

  static parseLocale (locale: string): I18NLocaleCodes {
    let [language, country] = (locale || "").split("-");

    language  = (language || "").toLowerCase();
    country    = (country || "").toUpperCase();

    return {
      language,
      country
    };
  }

  static _forEachKeyValue (obj: Map<any, any> | Record<string, any>, cb: (value: any, key: any) => any): void {
    if(obj) {
      if(obj instanceof Map) {
        obj.forEach(cb);
      } else if(typeof obj === "object") {
        for(const key in obj) {
          cb.call(obj, obj[key], key);
        }
      }
    }
  }

  static instances: Map<string, I18N> = new Map();

  static getInstance (key: string = "default", opts = { defaultLocale: "en" }): I18N {

    if(!this.instances.has(key)) {
      this.instances.set(key, new I18N(opts));
    }

    return this.instances.get(key);
  }
}


interface I18NStringOptions {
  locale: string;
  string: string | ((locale: string) => string);
}

export class I18NString {
  private locale: string;
  private string: string;

  constructor ({ locale, string: stringValue }: I18NStringOptions) {
    if(typeof stringValue === "function") {
      stringValue = stringValue(locale);
    }

    this.locale  = locale;
    this.string = stringValue || "";
  }

  toString (): string {
    if(typeof this.string === "object") {
      return this.string["+"] || "";
    }

    return this.string || "";
  }

  applyVariables (vars: Record<string, any> = {}): I18NString {
    let string = this.string;

    if(typeof string === "object") {
      vars = Object.assign({ count: 0 }, vars);

      const count = `${vars.count}`;

      string = (count in string) ? string[count] : string["+"];
    }

    I18N._forEachKeyValue(vars, (val: string, key: any) => {
      string = I18NString.variablesInterpolation(string, val, key);
    });

    this.string = string;

    return this;
  }

  stripPlaceholders (): void {
    this.string = this.string.replace(/\{[a-z0-9_-]+\}/gmi, "");
  }

  static variablesInterpolation (str: string, val: string | (() => string), key: string): string {
    if(typeof val === "function") {
      val = val();
    }

    return str.replace(new RegExp(`\\{${key}\\}`, "g"), val);
  }
}

interface I18NLocaleOptions {
  i18n?: I18N;
  locale: string;
}

type I18NLocaleStrings = Record<string, string>;

interface I18NLocaleCodes {
  language: string;
  country: string;
}

export class I18NLocale {
  private i18n: I18N;
  private locale: string;
  private strings: Map<string, string> = new Map();

  constructor ({ i18n, locale }: I18NLocaleOptions) {
    this.i18n   = i18n;
    this.locale = locale;
  }

  number (val: number, opts: Intl.NumberFormatOptions & {locale?: string; format?: string} = {}): string {
    /*
      style: decimal, currency, percent
      currency
      currencyDisplay: symbol, code, name
      useGrouping: true, false
      minimumIntegerDigits: 1 - 21
      minimumFractionDigits: 0 - 20
      minimumSignificantDigits: 1 - 21
      maximumSignificantDigits: 1 - 21
    */

    const inst = new Intl.NumberFormat(this.locale, opts);

    return inst.format(val);
  }

  currency (val: number, opts: Intl.NumberFormatOptions & {locale?: string; format?: string} = {}): string {
    opts = Object.assign({
      style: "currency",
      currencyDisplay: "symbol",
      currency: "EUR"
    }, opts);

    const inst = new Intl.NumberFormat(this.locale, opts);

    return inst.format(val);
  }

  datetime (val: Date, opts: Intl.DateTimeFormatOptions & {locale?: string; format?: string} = {}): string {
    /*
      timeZone
      hour12: true, false
      formatMatcher: "basic", "best fit"
      weekday: "narrow", "short", "long"
      era: "narrow", "short", "long"
      year: "numeric", "2-digit"
      month: "numeric", "2-digit", "narrow", "short", "long"
      day: "numeric", "2-digit"
      hour: "numeric", "2-digit"
      minute: "numeric", "2-digit"
      second: "numeric", "2-digit"
      timeZoneName: "short", "long"
    */

    opts = Object.assign({
      hour12: false
    }, opts);

    const presets: Record<string, any> = {
      "datetime": {
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric"
      },
      "date": {
        year: "numeric", month: "numeric", day: "numeric"
      },
      "time": {
        hour: "numeric", minute: "numeric", second: "numeric"
      },
      "h:m": {
        hour: "numeric", minute: "numeric"
      }
    };

    const format = (opts as any).format;

    if(format && format in presets) {
      opts = Object.assign(presets[format], opts);
    }

    val = new Date(val || new Date());

    const inst = new Intl.DateTimeFormat(this.locale, opts);

    return inst.format(val);
  }

  setStrings (stringsList: I18NLocaleStrings): void {
    I18N._forEachKeyValue(stringsList, (val: string, key: string) => {
      this.strings.set(key, val);
    });
  }

  hasStrings (): boolean {
    return (this.strings.size > 0);
  }

  getStrings (): Map<string, string> {
    return new Map(this.strings);
  }

  get (key: string, vars: Record<string, any> = null): I18NString | null {
    if(!this.i18n.hasLocaleStrings(this.locale)) {
      return null;
    }

    const list    = this.i18n.getLocaleStrings(this.locale);
    const string  = list.has(key) ? list.get(key) : null;

    if(string !== null) {
      const stringObj = new I18NString({ locale: this.locale, string });

      if(vars) {
        stringObj.applyVariables(vars);
      }

      return stringObj;
    }

    return null;
  }
}

export const L = (key: string, vars: Record<string, any> = null, opts: {instance?: string; locale?: string} = {}): string | I18NString => {
  const i18nInst  = I18N.getInstance(opts.instance || "default");
  const localesList: string[] = [];

  if(opts.locale) {
    localesList.push(opts.locale);
  }

  localesList.push(I18N.getClientLocale());
  localesList.push(I18N.getClientLanguage());
  localesList.push(i18nInst.getDefaultLocale());

  let res    = null;

  do {
    const loc = localesList.shift();

    if(i18nInst.hasLocale(loc)) {
      res = i18nInst.getLocale(loc).get(key, vars);
    }
  }
  while(res === null && localesList.length > 0);

  return (res === null) ? key : res;
};

export const datetime = (val: Date, opts: {locale?: string} = {}): string => {
  const loc = new I18NLocale({ locale: opts.locale || I18N.getClientLocale() });

  return loc.datetime(val, Object.assign({ format: "datetime" }, opts));
};

export const date = (val: Date, opts: {locale?: string} = {}): string => {
  const loc = new I18NLocale({ locale: opts.locale || I18N.getClientLocale() });

  return loc.datetime(val, Object.assign({ format: "date" }, opts));
};

export const time = (val: Date, opts: {locale?: string} = {}): string => {
  const loc = new I18NLocale({ locale: opts.locale || I18N.getClientLocale() });

  return loc.datetime(val, Object.assign({ format: "time" }, opts));
};

export const currency = (val: number, opts: {locale?: string} = {}): string=> {
  const loc = new I18NLocale({ locale: opts.locale || I18N.getClientLocale() });

  return loc.currency(val, opts);
};

export const number = (val: number, opts: {locale?: string} = {}): string => {
  const loc = new I18NLocale({ locale: opts.locale || I18N.getClientLocale() });

  return loc.number(val, opts);
};
