export class I18NString
{
	constructor({locale, string})
	{
		if(typeof string == "function")
		{
			string = string(locale);
		}

		this.locale	= locale;
		this.string = string || "";
	}

	toString()
	{
		if(typeof this.string == "object")
		{
			return this.string["+"] || "";
		}

		return this.string || "";
	}

	applyVariables(vars = {})
	{
		var string = this.string;

		if(typeof string == "object")
		{
			vars = Object.assign({count: 0}, vars);

			const count = `${vars.count}`;

			string = (count in string) ? string[count] : string["+"];
		}

		I18N._forEachKeyValue(vars, (val, key) =>
		{
			string = I18NString.variablesInterpolation(string, val, key);
		});

		this.string = string;

		return this;
	}

	stripPlaceholders()
	{
		this.string = this.string.replace(/\{[a-z0-9_-]+\}/gmi, "");
	}

	static variablesInterpolation(str, val, key)
	{
		if(typeof val == "function")
		{
			val = val();
		}

		return str.replace(new RegExp(`\\{${key}\\}`, "g"), val);
	}
}

export class I18NLocale
{
	constructor({i18n, locale})
	{
		this.i18n		= i18n;
		this.locale		= locale
		this.strings	= new Map();
	}

	number(val = 0, opts = {})
	{
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

		var inst = new Intl.NumberFormat(this.locale, opts);

		return inst.format(val);
	}

	currency(val = 0, opts = {})
	{
		opts = Object.assign({
			style: "currency",
			currencyDisplay: "symbol",
			currency: "EUR"
		}, opts);

		const inst = new Intl.NumberFormat(this.locale, opts);

		return inst.format(val);
	}

	datetime(val, opts = {})
	{
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

		const presets = {
			"datetime": {
				year: "numeric", month: "numeric", day: "numeric",
				hour: "numeric", minute: "numeric", second: "numeric",
			},
			"date": {
				year: "numeric", month: "numeric", day: "numeric"
			},
			"time": {
				hour: "numeric", minute: "numeric", second: "numeric"
			},
			"h:m": {
				hour: "numeric", minute: "numeric"
			},
		};

		if(opts.format && opts.format in presets)
		{
			opts = Object.assign(presets[opts.format], opts);
		}

		val = new Date(val || new Date());

		const inst = new Intl.DateTimeFormat(this.locale, opts);

		return inst.format(val);
	}

	setStrings(stringsList)
	{
		I18N._forEachKeyValue(stringsList, (val, key) =>
		{
			this.strings.set(key, val);
		});
	}

	hasStrings()
	{
		return (this.strings.size > 0);
	}

	getStrings()
	{
		return this.strings;
	}

	get(key, vars = null)
	{
		if(!this.i18n.hasLocaleStrings(this.locale))
		{
			return null;
		}

		const list		= this.i18n.getLocaleStrings(this.locale);
		const string	= list.has(key) ? list.get(key) : null;

		if(string !== null)
		{
			const stringObj = new I18NString({locale: this.locale, string});

			if(vars)
			{
				stringObj.applyVariables(vars);
			}

			return stringObj;
		}

		return null;
	}
}

export default class I18N
{
	constructor({defaultLocale} = {defaultLocale: "en"})
	{
		this.locales	= new Map();
		this.strings	= new Map();
		this.default	= "en";

		this.setDefaultLocale(defaultLocale)
	}

	setDefaultLocale(locale)
	{
		this.default	= locale || "en";
	}

	getDefaultLocale()
	{
		return this.default || "en";
	}

	hasLocale(locale)
	{
		return this.locales.has(locale);
	}

	getLocale(locale = null)
	{
		locale = locale || I18N.getClientLocale();

		if(!this.locales.has(locale))
		{
			this.locales.set(locale, new I18NLocale({i18n: this, locale}));
		}

		return this.locales.get(locale);
	}

	setLocaleStrings(locale, stringsList)
	{
		const loc = this.getLocale(locale);

		loc.setStrings(stringsList);
	}

	hasLocaleStrings(locale)
	{
		if(this.hasLocale(locale))
		{
			const loc = this.getLocale(locale);

			return loc.hasStrings();
		}

		return false;
	}

	getLocaleStrings(locale)
	{
		const loc = this.getLocale(locale);

		return loc.getStrings();
	}

	static getClientLocale()
	{
		if (navigator.languages != undefined)
		{
			return navigator.languages[0];
		}

		return navigator.language;
	}

	static getClientLanguage()
	{
		return this.parseLocale(this.getClientLocale()).language;
	}

	static getClientCountry()
	{
		return this.parseLocale(this.getClientLocale()).country;
	}

	static parseLocale(locale)
	{
		var [language, country] = (locale || "").split("-");

		language	= (language || "").toLowerCase();
		country		= (country || "").toUpperCase();

		return {
			language,
			country
		};
	}

	static _forEachKeyValue(obj, cb)
	{
		if(obj)
		{
			if(obj instanceof Map)
			{
				obj.forEach(cb);
			}
			else if(typeof obj == "object")
			{
				for(let key in obj)
				{
					cb.call(obj, obj[key], key);
				}
			}
		}
	}

	static getInstance(key = "default", opts = {defaultLocale: "en"})
	{
		if(!this.instances)
		{
			this.instances = new Map();
		}

		if(!this.instances.has(key))
		{
			this.instances.set(key, new I18N(opts))
		}

		return this.instances.get(key);
	}
}

export const L = (key, vars = null, opts = {}) =>
{
	const i18nInst	= I18N.getInstance(opts.instance || "default");


	var localesList = [];

	if(opts.locale)
	{
		localesList.push(localesList);
	}

	localesList.push(I18N.getClientLocale());
	localesList.push(I18N.getClientLanguage());
	localesList.push(i18nInst.getDefaultLocale());

	var res		= null;

	do
	{
		var loc = localesList.shift();

		if(i18nInst.hasLocale(loc))
		{
			res = i18nInst.getLocale(loc).get(key, vars);
		}
	}
	while(res === null && localesList.length > 0);

	return (res === null) ? key : res;
};

export const datetime = (val, opts = {}) =>
{
	const loc = new I18NLocale({locale: opts.locale || I18N.getClientLocale()});

	return loc.datetime(val, Object.assign({format: "datetime"}, opts));
};

export const date = (val, opts = {}) =>
{
	const loc = new I18NLocale({locale: opts.locale || I18N.getClientLocale()});

	return loc.datetime(val, Object.assign({format: "date"}, opts));
};

export const time = (val, opts = {}) =>
{
	const loc = new I18NLocale({locale: opts.locale || I18N.getClientLocale()});

	return loc.datetime(val, Object.assign({format: "time"}, opts));
};

export const currency = (val, opts = {}) =>
{
	const loc = new I18NLocale({locale: opts.locale || I18N.getClientLocale()});

	return loc.currency(val, opts);
};

export const number = (val, opts = {}) =>
{
	const loc = new I18NLocale({locale: opts.locale || I18N.getClientLocale()});

	return loc.number(val, opts);
};
