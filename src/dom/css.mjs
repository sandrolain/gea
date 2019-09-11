import {forEach} from "../lib/utils.mjs";

const numberOnlyProperties = {
	"z-index": true,
	"font-weight": true,
	"opacity": true,
	"zoom": true
};

const multiValuesProperties = {
	"margin": true,
	"padding": true,
	"border-radius": true
};

export class Rule
{
	constructor(sheet, selector, props = {})
	{
		this.sheet		= sheet;
		this.selector	= selector;
		this.states		= new Map();

		this.setProperties(props);

		this.ruleProxy = new Proxy(this, {
			has: (target, name) =>
			{
				return this.hasProperty(name);
			},
			get: (target, name) =>
			{
				if(typeof this[name] == "function")
				{
					return this[name].bind(this);
				}
				else if(["className"].indexOf(name) > -1)
				{
					return this[name];
				}

				return this.getProperty(name);
			},
			set: (target, name, value) =>
			{
				if(["className"].indexOf(name) > -1)
				{
					this[name] = value;
				}
				else
				{
					this.setProperty(name, value);
				}

				return true;
			},
			deleteProperty: (target, name) =>
			{
				return this.deleteProperty(name);
			}
		});

		return this.ruleProxy;
	}

	hasProperty(name)
	{
		return this.sheet.hasProperty(this.selector, name);
	}

	getProperty(name)
	{
		return this.sheet.getProperty(this.selector, name);
	}

	setProperty(name, value)
	{
		return this.sheet.setProperty(this.selector, name, value);
	}

	deleteProperty(name)
	{
		return this.sheet.deleteProperty(this.selector, name);
	}

	setProperties(props)
	{
		return this.sheet.setRule(this.selector, props);
	}

	getProperties()
	{
		return this.sheet.getSelectorProperties(this.selector);
	}

	[Symbol.iterator]()
	{
		const properties	= this.getProperties();
		const keys			= Object.keys(properties);

		var index			= 0;

		return {
			next()
			{
				if (index < keys.length)
				{
					const key = keys[index++];

					return {
						done: false,
						value: [key, properties[key]]
					};
				}

				return {
					done: true
				};
			}
		};
	}

	derivedRule(selector, props = {})
	{
		if(selector.indexOf("&") > -1)
		{
			selector = selector.replace("&", this.selector)
		}
		else
		{
			selector = `${this.selector} ${selector}`;
		}

		return this.sheet.selectorRule(selector, props);
	}

	stateRule(state, props = {})
	{
		const rule = this.derivedRule(`&.${state}`, props);

		this.states.set(state, rule);

		return rule;
	}

	statesRules(states)
	{
		const res = new Map();

		forEach(states, (props, key) =>
		{
			const rule = this.stateRule(key, props);

			res.set(key, rule);
		});

		return res;
	}

	toString()
	{
		return "";
	}
}

export class ClassRule extends Rule
{
	constructor(sheet, className = null, props = {})
	{
		className = className || ClassRule.generateClassName();

		const proxy = super(sheet, `.${className}`, props);

		this.className = className;

		return proxy;
	}

	static generateClassName()
	{
		if(!this._counter)
		{
			this._counter = 0;
		}

		const num = (Math.round(Math.random() * 9999999999) * 10000) + this._counter++;

		return `sl-${num.toString(36)}`;
	}

	toString()
	{
		return this.className;
	}
}

export class Sheet
{
	constructor(name, media = "screen", content = null)
	{
		this.name = name || "";

		const $style = document.createElement("style");

		$style.setAttribute("media", media);

		$style.setAttribute("data-name", this.name);

		$style.appendChild(document.createTextNode(`/* SL StyleSheet : ${this.name} */`));

		if(content)
		{
			// TODO: manage object structures
			$style.appendChild(document.createTextNode(content));
		}

		document.head.appendChild($style);

		this.$style		= $style;
		this.styleSheet	= $style.sheet;

		this.sheetProxy = new Proxy(this, {
			has: (target, name) =>
			{
				return this.hasRule(name);
			},
			get: (target, name) =>
			{
				if(typeof this[name] == "function")
				{
					return this[name].bind(this);
				}
				else if(["$style", "styleSheet"].indexOf(name) > -1)
				{
					return this[name];
				}

				return this.selectorRule(name);
			},
			set: (target, name, value) =>
			{
				if(["styleSheet"].indexOf(name) > -1)
				{
					console.log("set styleSheet", value);

					this[name] = value;
				}
				else
				{
					this.setRule(name, value);
				}

				return true;
			},
			deleteProperty: (target, name) =>
			{
				return this.deleteRule(name);
			}
		});

		return this.sheetProxy;
	}

	hasProperty(selector, property)
	{
		const props = this.getSelectorProperties(selector);

		return props ? (property in props) : false;
	}

	getProperty(selector, property)
	{
		const props = this.getSelectorProperties(selector);

		return props ? props[property] : false;
	}

	setProperty(selector, property, value)
	{
		return this.setRule(selector, {[property] : value});
	}

	deleteProperty(selector, property)
	{
		const rules = this.getSelectorRulesList(selector);

		for(let rule of rules)
		{
			let style = rule.style;

			style.removeProperty(property);
		}
	}

	hasRule(selector)
	{
		const rule = this.getSelectorRulesList(selector);

		return (rule.length > 0);
	}

	deleteRule(selector)
	{
		const cssRules = this.styleSheet.cssRules;

		for(let i = 0, len = cssRules.length; i < len; i++)
		{
			let rule = cssRules[i];

			if(rule.selectorText == selector)
			{
				this.styleSheet.deleteRule(i);
			}
		}
	}

	setRule(selector, props, index = -1)
	{
		const rule = this.getSelectorLastRule(selector, index);

		return rule ? this._applyPropsToRule(rule, props) : false;
	}

	_applyPropsToRule(rule, props)
	{
		const style = rule.style;

		for (let property in props)
		{
			let res = Sheet.fixPropertyValue(property, props[property]);

			style.setProperty(res.property, res.value, res.priority);
		}

		return this;
	}

	getRuleByIndex(index)
	{
		return this.styleSheet.cssRules[index];
	}

	getSelectorRulesList(selector)
	{
		const rules = Array.from(this.styleSheet.cssRules);

		return rules.filter((rule) => (rule.selectorText == selector));
	}

	getSelectorLastRule(selector, index = -1)
	{
		var rule = this.getSelectorRulesList(selector).pop();

		if(!rule)
		{
			const sheet = this.styleSheet;

			index = index < 0 ? sheet.cssRules.length : index;

			const newIndex = sheet.insertRule(`${selector} {}`, index);

			rule = this.getRuleByIndex(newIndex);
		}

		return rule;
	}

	getSelectorProperties(selector)
	{
		const rules = this.getSelectorRulesList(selector);
		const res	= {};
		var defined	= false;

		for(let rule of rules)
		{
			defined		= true;

			let styles	= rule.style;

			for(let i = 0, len = styles.length; i < len; i++)
			{
				let property	= Sheet.camelCase(styles[i]);
				let value		= styles[property];

				if (typeof value != "undefined")
				{
					res[property] = value;
				}
			}
		}

		return defined ? res : false;
	}

	getRules()
	{
		return this.styleSheet.cssRules;
	}

	[Symbol.iterator]()
	{
		const rules	= this.styleSheet.cssRules;

		var index	= 0;

		return {
			next()
			{
				if (index < rules.length)
				{
					return {
						done: false,
						value: rules[index++]
					};
				}

				return {
					done: true
				};
			}
		};
	}

	selectorRule(selector, props = {})
	{
		return new Rule(this, selector, props);
	}

	classRule(className = null, props = {})
	{
		if(className && typeof className == "object")
		{
			props		= className;
			className	= null;
		}

		return new ClassRule(this, className, props);
	}

	static getRulesString(rules)
	{
		const temp = [];

		for(let prop in rules)
		{
			temp.push(this.fixPropertyValueAsString(prop, rules[prop]));
		}

		return temp.join("\n");
	}

	static fixPropertyValue(property, value, priority = "")
	{
		property = this.hyphenate(property);

		const valType = typeof value;

		if(valType == "number")
		{
			if(property.match(/color/i))
			{
				value = `#${value.toString(16)}`;
			}
			else if(!numberOnlyProperties[property])
			{
				value += "px";
			}
		}
		else
		{
			if(property == "background-image-url")
			{
				property	= "background-image";
				value		= `url(${value})`;
			}

			if(value instanceof Array)
			{
				// TODO: caso array [valore, unità] es [10, "em"]

				let list = [];

				for(let val of value)
				{
					let res = this.fixPropertyValue(property, val);

					list.push(res.value);
				}

				let sep = multiValuesProperties[property] > -1 ? " " : ", ";

				value = list.join(sep);
			}
		}

		value = `${value}`;

		return {
			property,
			value,
			priority
		};
	}

	static fixPropertyValueAsString(property, value, pad = 0)
	{
		const res = this.fixPropertyValue(property, value);

		return `${"  ".repeat(pad)}${res.property}: ${res.value}${res.priority ? " " : ""}${res.priority};`;
	}

	static camelCase(str)
	{
		return str.replace(/-\D/g, function(m)
		{
			return m.charAt(1).toUpperCase();
		});
	}

	static hyphenate(str)
	{
		return str.replace(/[A-Z]/g, function(m)
		{
			return ("-" + m.toLowerCase());
		});
	}



	static getStyleSheet({sheetName = "default", media = "screen", content = null} = {})
	{
		if(!this._styleSheets)
		{
			this._styleSheets = new Map();
		}

		if(!this._styleSheets.has(sheetName))
		{
			const styleSheet = new Sheet(sheetName, media, content);

			this._styleSheets.set(sheetName, styleSheet);
		}

		return this._styleSheets.get(sheetName);
	}

	static classRule({sheetName = "default", className = null, props} = {})
	{
		const sheet = this.getStyleSheet({sheetName});

		return sheet.classRule(className, props);
	}
}


export class ExternalSheet extends Sheet
{
	constructor(url, name, media = "screen")
	{
		const proxy = super(name || url, media);

		if(ExternalSheet.isSameDomain(url))
		{
			url = ExternalSheet.getAbsoluteUrl(url);

			fetch(url).then((res) => res.text()).then((css) =>
			{
				const addedCss = [];

				for(let rule of this.styleSheet.cssRules)
				{
					addedCss.push(rule.cssText);
				}

				this.$style.appendChild(document.createTextNode(`${css} ${addedCss.join("")}`));

				// after the addition of a new source a new instance of CSSStyleSheet linked to the DOM node is created
				this.styleSheet = this.$style.sheet;
			});
		}
		else
		{
			this.$style.appendChild(document.createTextNode(`@import url(${url})`));
		}

		return proxy;
	}

	static isSameDomain(url)
	{
		const $a = document.createElement("a");
		$a.setAttribute("href", url);

		return ($a.hostname === window.location.hostname);
	}

	static getAbsoluteUrl(url)
	{
		const $a = document.createElement("a");
		$a.setAttribute("href", url);

		return $a.href.toString();
	}

	static import(url)
	{
		return new ExternalSheet(url);
	}
}


class CSSFragment
{
	constructor(css)
	{
		this.css = css;
		// TODO: parser
	}


}

export const objectToCSSString = (obj, parentKey = null, pad = 0) =>
{
	const res = [];
	const sub = [];

	for(let key in obj)
	{
		let val		= obj[key];
		let valType	= typeof val;
		let subKey	= key;
		let mediaKey;

		if(key.match(/@media/i))
		{
			mediaKey	= key;
			subKey		= null;
			pad			+= 1;
		}
		else if(parentKey)
		{
			subKey = `${parentKey} ${key}`;
		}

		// check ed esecuzuone se funzione
		if(valType == "function")
		{
			val = val();

			valType = typeof val;
		}

		if(mediaKey)
		{
			sub.push(`${mediaKey} {`);
		}

		if(valType != "undefined" && val !== null)
		{
			if(valType == "object" && !(val instanceof Array))
			{
				sub.push(objectToCSSString(val, subKey, pad));

				// TODO: caso Array?
			}
			else
			{
				res.push(Sheet.fixPropertyValueAsString(key, val, pad + 1));
			}
		}

		if(mediaKey)
		{
			sub.push("}");
		}
	}

	if(res.length > 0 && parentKey)
	{
		res.unshift(`${"  ".repeat(pad)}${parentKey} {`);
		res.push(`${"  ".repeat(pad)}}\n`);
	}

	return res.concat(sub).join("\n");
};


const css = (parts, ...args) =>
{
	if(typeof parts == "object" && !(parts instanceof Array) && args.length === 0)
	{
		args	= [parts];
		parts	= [""];
	}

	const checkArgType = (arg) =>
	{
		let argType = typeof arg;

		if(argType == "function")
		{
			arg = arg();

			argType = typeof arg;
		}

		if(argType === "undefined" && arg === null)
		{
			return "";
		}


		if(argType == "string" || argType == "number")
		{
			return arg;
		}


		if(argType == "object")
		{
			if(arg instanceof Array)
			{
				return arg.map(val => checkArgType(val)).join("");
			}

			return objectToCSSString(arg);
		}

		return "";
	};




	const css = [];

	for(let str of parts)
	{
		css.push(str.trim());

		let res = checkArgType(args.shift());

		if(res)
		{
			css.push(res);
		}
	}

	return new CSSFragment(css.join(""))
}


export default css;
