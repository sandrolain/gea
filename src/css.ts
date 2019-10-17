import { forEach, ForEachIterable } from "./utils";

const numberOnlyProperties: Record<string, boolean> = {
  "z-index": true,
  "font-weight": true,
  "opacity": true,
  "zoom": true
};

const multiValuesProperties: Record<string, boolean> = {
  "margin": true,
  "padding": true,
  "border-radius": true
};

export type RuleProps = Record<string, any>;

export class Rule {
  protected states: Map<string, any> = new Map();
  protected ruleProxy: Rule;

  constructor (protected sheet: Sheet, protected selector: string, props = {}) {

    this.setProperties(props);

    this.ruleProxy = new Proxy(this, {
      has: (target: Rule, name: string): boolean => {
        return this.hasProperty(name);
      },
      get: (target: Rule, name: string): any => {
        if(typeof (this as any)[name] === "function") {
          return (this as any)[name].bind(this);
        } else if(["className"].indexOf(name) > -1) {
          return (this as any)[name];
        }

        return this.getProperty(name);
      },
      set: (target: Rule, name: string, value: any): boolean => {
        if(["className"].indexOf(name) > -1) {
          (this as any)[name] = value;
        } else {
          this.setProperty(name, value);
        }

        return true;
      },
      deleteProperty: (target: Rule, name: string): boolean => {
        this.deleteProperty(name);
        return true;
      }
    });

    return this.ruleProxy;
  }

  hasProperty (name: string): boolean {
    return this.sheet.hasProperty(this.selector, name);
  }

  getProperty (name: string): string | false {
    return this.sheet.getProperty(this.selector, name);
  }

  setProperty (name: string, value: any): boolean {
    return !!this.sheet.setProperty(this.selector, name, value);
  }

  deleteProperty (name: string): void {
    this.sheet.deleteProperty(this.selector, name);
  }

  setProperties (props: RuleProps): void {
    this.sheet.setRule(this.selector, props);
  }

  getProperties (): RuleProps | false {
    return this.sheet.getSelectorProperties(this.selector);
  }

  [Symbol.iterator] (): Iterator<[string, any]> {
    const properties  = this.getProperties();
    const keys      = Object.keys(properties);

    let index      = 0;

    return {
      next (): IteratorResult<[string, any]> {
        if(properties && index < keys.length) {
          const key = keys[index++];

          return {
            done: false,
            value: [key, properties[key]]
          };
        }

        return {
          done: true,
          value: null
        };
      }
    };
  }

  derivedRule (selector: string, props: RuleProps = {}): Rule {
    if(selector.indexOf("&") > -1) {
      selector = selector.replace("&", this.selector);
    } else {
      selector = `${this.selector} ${selector}`;
    }

    return this.sheet.selectorRule(selector, props);
  }

  stateRule (state: string, props: RuleProps = {}): Rule {
    const rule = this.derivedRule(`&.${state}`, props);

    this.states.set(state, rule);

    return rule;
  }

  statesRules (states: ForEachIterable): Map<string, Rule> {
    const res = new Map();

    forEach(states, (props, key) => {
      const rule = this.stateRule(key, props);
      res.set(key, rule);
    });

    return res;
  }

  toString (): string {
    return "";
  }
}


export class ClassRule extends Rule {
  public readonly className: string;

  constructor (sheet: Sheet, className: string = null, props: RuleProps = {}) {
    className = className || ClassRule.generateClassName();

    super(sheet, `.${className}`, props);

    this.className = className;

    return this.ruleProxy as ClassRule;
  }

  protected static _counter = 0;

  static generateClassName (): string {

    const num = (Math.round(Math.random() * 9999999999) * 10000) + this._counter++;

    return `sl-${num.toString(36)}`;
  }

  toString (): string {
    return this.className;
  }
}

export interface SheetOptions {
  sheetName?: string;
  media?: string;
  content?: string;
  props?: RuleProps;
}

export class Sheet {
  protected $style: HTMLStyleElement;
  protected styleSheet: CSSStyleSheet;
  protected sheetProxy: {};

  constructor (protected name: string = "", media: string = "screen", content: string = null) {

    const $style = document.createElement("style");

    $style.setAttribute("media", media);
    $style.setAttribute("data-name", this.name);
    $style.appendChild(document.createTextNode(`/* SL StyleSheet : ${this.name} */`));

    if(content) {
      // TODO: manage object structures
      $style.appendChild(document.createTextNode(content));
    }

    document.head.appendChild($style);

    this.$style     = $style;
    this.styleSheet = $style.sheet as CSSStyleSheet;

    this.sheetProxy = new Proxy({}, {
      has: (target: {}, name: string): boolean => {
        return this.hasRule(name);
      },
      get: (target: {}, name: string): any => {
        if(typeof (this as any)[name] === "function") {
          return (this as any)[name].bind(this);
        } else if(["$style", "styleSheet"].indexOf(name) > -1) {
          return (this as any)[name];
        }

        return this.selectorRule(name);
      },
      set: (target: {}, name: string, value: any): boolean => {
        if(["styleSheet"].indexOf(name) > -1) {
          (this as any)[name] = value;
        } else {
          this.setRule(name, value);
        }

        return true;
      },
      deleteProperty: (target: {}, name: string): boolean => {
        this.deleteRule(name);
        return true;
      }
    });

    return this.sheetProxy as Sheet;
  }

  hasProperty (selector: string, property: string): boolean {
    const props = this.getSelectorProperties(selector);
    return props ? (property in props) : false;
  }

  getProperty (selector: string, property: string): string | false {
    const props = this.getSelectorProperties(selector);
    return props ? props[property] : false;
  }

  setProperty (selector: string, property: string, value: any): Sheet | false {
    return this.setRule(selector, { [property] : value });
  }

  deleteProperty (selector: string, property: string): void {
    const rules = this.getSelectorRulesList(selector);

    for(const rule of rules) {
      if(!( rule instanceof CSSStyleRule)) {
        continue;
      }

      const style = rule.style;

      style.removeProperty(property);
    }
  }

  hasRule (selector: string): boolean {
    const rule = this.getSelectorRulesList(selector);

    return (rule.length > 0);
  }

  deleteRule (selector: string): void {
    const cssRules = this.styleSheet.cssRules;

    for(let i = 0, len = cssRules.length; i < len; i++) {
      const rule = cssRules[i];

      if(!( rule instanceof CSSStyleRule)) {
        continue;
      }

      if(rule.selectorText === selector) {
        this.styleSheet.deleteRule(i);
      }
    }
  }

  setRule (selector: string, props: RuleProps, index = -1): Sheet | false {
    const rule = this.getSelectorLastRule(selector, index);

    return rule ? this._applyPropsToRule(rule, props) : false;
  }

  protected _applyPropsToRule (rule: CSSRule, props: RuleProps): Sheet {
    if(!(rule instanceof CSSStyleRule)) {
      return this;
    }

    const style = rule.style;

    for(const property in props) {
      const res = Sheet.fixPropertyValue(property, props[property]);

      style.setProperty(res.property, res.value, res.priority);
    }

    return this;
  }

  getRuleByIndex (index: number): CSSRule {
    return this.styleSheet.cssRules[index];
  }

  getSelectorRulesList (selector: string): CSSRule[] {
    const rules = Array.from(this.styleSheet.cssRules);

    return rules.filter((rule) => {
      return (rule instanceof CSSStyleRule && rule.selectorText === selector);
    });
  }

  getSelectorLastRule (selector: string, index = -1): CSSRule {
    let rule = this.getSelectorRulesList(selector).pop();

    if(!rule) {
      const sheet = this.styleSheet;

      index = index < 0 ? sheet.cssRules.length : index;

      const newIndex = sheet.insertRule(`${selector} {}`, index);

      rule = this.getRuleByIndex(newIndex);
    }

    return rule;
  }

  getSelectorProperties (selector: string): RuleProps | false {
    const rules = this.getSelectorRulesList(selector);
    const res: RuleProps = {};
    let defined  = false;

    for(const rule of rules) {
      if(!(rule instanceof CSSStyleRule)) {
        continue;
      }

      defined    = true;

      const styles  = rule.style;

      for(let i = 0, len = styles.length; i < len; i++) {
        const property  = Sheet.camelCase(styles[i]);
        const value    = (styles as any)[property];

        if(typeof value !== "undefined") {
          res[property] = value;
        }
      }
    }

    return defined ? res : false;
  }

  getRules (): CSSRule[] {
    return Array.from(this.styleSheet.cssRules);
  }

  [Symbol.iterator] (): Iterator<CSSRule> {
    const rules = this.styleSheet.cssRules;
    let   index = 0;

    return {
      next (): IteratorResult<CSSRule> {
        if(index < rules.length) {
          return {
            done: false,
            value: rules[index++]
          };
        }

        return {
          done: true,
          value: null
        };
      }
    };
  }

  selectorRule (selector: string, props: RuleProps = {}): Rule {
    return new Rule(this, selector, props);
  }

  classRule (className: string | RuleProps = null, props: RuleProps = {}): ClassRule {
    if(className && typeof className === "object") {
      props    = className;
      className  = null;
    }

    return new ClassRule(this, className as string, props);
  }

  static getRulesString (rules: RuleProps): string {
    const temp: string[] = [];

    for(const prop in rules) {
      temp.push(this.fixPropertyValueAsString(prop, rules[prop]));
    }

    return temp.join("\n");
  }

  static fixPropertyValue (property: string, value: any, priority = ""): {property: string; value: string; priority: string} {
    property = this.hyphenate(property);

    const valType = typeof value;

    if(valType === "number") {
      if(property.match(/color/i)) {
        value = `#${value.toString(16)}`;
      } else if(!numberOnlyProperties[property]) {
        value += "px";
      }
    } else {
      if(property === "background-image-url") {
        property  = "background-image";
        value    = `url(${value})`;
      }

      if(value instanceof Array) {
        // TODO: caso array [valore, unità] es [10, "em"]

        const list = [];

        for(const val of value) {
          const res = this.fixPropertyValue(property, val);

          list.push(res.value);
        }

        const sep = multiValuesProperties[property] ? " " : ", ";

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

  static fixPropertyValueAsString (property: string, value: any, pad = 0): string {
    const res = this.fixPropertyValue(property, value);

    return `${"  ".repeat(pad)}${res.property}: ${res.value}${res.priority ? " " : ""}${res.priority};`;
  }

  // TODO: move to external lib
  static camelCase (str: string): string {
    return str.replace(/-\D/g, function (m: string): string {
      return m.charAt(1).toUpperCase();
    });
  }

  // TODO: move to external lib
  static hyphenate (str: string): string {
    return str.replace(/[A-Z]/g, function (m: string): string {
      return `-${m.toLowerCase()}`;
    });
  }

  static _styleSheets: Map<string, Sheet> = new Map();

  static getStyleSheet ({ sheetName = "default", media = "screen", content = null }: SheetOptions = {}): Sheet {
    if(!this._styleSheets.has(sheetName)) {
      const styleSheet = new Sheet(sheetName, media, content);

      this._styleSheets.set(sheetName, styleSheet);
    }

    return this._styleSheets.get(sheetName);
  }

  static classRule ({ sheetName = "default", className = null, props }: {sheetName?: string; className?: string; props?: RuleProps} = {}): ClassRule {
    const sheet = this.getStyleSheet({ sheetName });

    return sheet.classRule(className, props);
  }
}


export class ExternalSheet extends Sheet {
  constructor (url: string, name?: string, media: string = "screen") {
    super(name || url, media);

    if(ExternalSheet.isSameDomain(url)) {
      url = ExternalSheet.getAbsoluteUrl(url);

      fetch(url).then((res) => res.text()).then((css) => {
        const addedCss = [];

        for(const rule of Array.from(this.styleSheet.cssRules)) {
          addedCss.push(rule.cssText);
        }

        this.$style.appendChild(document.createTextNode(`${css} ${addedCss.join("")}`));

        // after the addition of a new source a new instance of CSSStyleSheet linked to the DOM node is created
        this.styleSheet = this.$style.sheet as CSSStyleSheet;
      });
    } else {
      this.$style.appendChild(document.createTextNode(`@import url(${url})`));
    }

    return this.sheetProxy as ExternalSheet;
  }

  static isSameDomain (url: string): boolean {
    const $a = document.createElement("a");
    $a.setAttribute("href", url);

    return ($a.hostname === window.location.hostname);
  }

  static getAbsoluteUrl (url: string): string {
    const $a = document.createElement("a");
    $a.setAttribute("href", url);

    return $a.href.toString();
  }

  static import (url: string): ExternalSheet {
    return new ExternalSheet(url);
  }
}


export class CSSFragment {
  constructor (protected css: string) {
    // TODO: parser
  }
}

export const objectToCSSString = (obj: Record<string, any>, parentKey: string = null, pad: number = 0): string => {
  const res = [];
  const sub = [];

  for(const key in obj) {
    let val     = obj[key];
    let valType = typeof val;
    let subKey  = key;
    let mediaKey;

    if(key.match(/@media/i)) {
      mediaKey  = key;
      subKey    = null;
      pad      += 1;
    } else if(parentKey) {
      subKey = `${parentKey} ${key}`;
    }

    // check ed esecuzuone se funzione
    if(valType === "function") {
      val     = val();
      valType = typeof val;
    }

    if(mediaKey) {
      sub.push(`${mediaKey} {`);
    }

    if(valType !== "undefined" && val !== null) {
      if(valType === "object" && !(val instanceof Array)) {
        sub.push(objectToCSSString(val, subKey, pad));

        // TODO: caso Array?
      } else {
        res.push(Sheet.fixPropertyValueAsString(key, val, pad + 1));
      }
    }

    if(mediaKey) {
      sub.push("}");
    }
  }

  if(res.length > 0 && parentKey) {
    res.unshift(`${"  ".repeat(pad)}${parentKey} {`);
    res.push(`${"  ".repeat(pad)}}\n`);
  }

  return res.concat(sub).join("\n");
};


const css = (parts: string[], ...args: any[]): CSSFragment => {
  if(typeof parts === "object" && !(parts instanceof Array) && args.length === 0) {
    args  = [parts];
    parts  = [""];
  }

  const checkArgType = (arg: any): string => {
    let argType = typeof arg;

    if(argType === "function") {
      arg     = arg();
      argType = typeof arg;
    }

    if(argType === "undefined" && arg === null) {
      return "";
    }

    if(argType === "string" || argType === "number") {
      return arg;
    }

    if(argType === "object") {
      if(arg instanceof Array) {
        return arg.map(val => checkArgType(val)).join("");
      }

      return objectToCSSString(arg);
    }

    return "";
  };


  const css = [];

  for(const str of parts) {
    css.push(str.trim());

    const res = checkArgType(args.shift());

    if(res) {
      css.push(res);
    }
  }

  return new CSSFragment(css.join(""));
};


export default css;
