
type RuleFunc = (value: any, ...args: any[]) => boolean;

export class ValidatorRules {
  static rulesMap: Map<string, RuleFunc> = new Map ();

  static getRulesMap (): Map<string, RuleFunc> {
    return this.rulesMap;
  }

  static setRules (rulesList: Record<string, RuleFunc>): void {
    for(const ruleName in rulesList) {
      this.setRule(ruleName, rulesList[ruleName]);
    }
  }

  static setRule (name: string, func: RuleFunc): void {
    this.getRulesMap().set(name, func);
  }

  static getRule (name: string): RuleFunc {
    return this.getRulesMap().get(name);
  }

  static validateWithRule (name: string, ...args: any[]): boolean {
    const func =  this.getRule(name);

    if(func) {
      return !!func.apply(this, args);
    }

    return false;
  }
}




export interface ValidatorCheck {
  rule: string;
  valid: boolean;
}

export class Validator {
  protected checks: ValidatorCheck[] = [];

  static minPasswordSize: number = 10;

  constructor (protected value: any) {

    const proxy = new Proxy(this, {
      has: (target, name: string): boolean => {
        if(name in target) {
          return true;
        }

        return !!ValidatorRules.getRule(name);
      },
      get: (target: Validator, name: string): any => {
        if(name in target) {
          return (target as any)[name];
        }

        return function (...args: any[]): Validator {
          const valid = ValidatorRules.validateWithRule(name, target.value, ...args);

          target.checks.push({
            rule: name,
            valid: valid
          });

          return this;
        };
      },
      set: (target: Validator, name: string, value: any): boolean => {
        if(name === "value") {
          this.value = value;

          return true;
        }

        return false;
      }
    });

    return proxy;
  }

  isValid (): boolean {
    return this.checks.reduce((prev, curr) => {
      return prev && curr.valid;

    }, true);
  }

  notValid (): boolean {
    return !this.isValid ();
  }

  getChecks (): ValidatorCheck[] {
    return this.checks.slice(0);
  }
}


ValidatorRules.setRules({
  numeric: (value) => {
    return ValidatorRules.validateWithRule("number", value) || !isNaN(parseFloat(value));
  },
  number: (value) => {
    return (typeof value === "number" && !isNaN(value));
  },
  num: (value) => {
    return ValidatorRules.validateWithRule("number", value);
  },
  integer: (value) => {
    return (typeof value === "number" && value === Math.round(value));
  },
  int: (value) => {
    return ValidatorRules.validateWithRule("integer", value);
  },
  boolean: (value) => {
    return (typeof value === "boolean");
  },
  bool: (value) => {
    return ValidatorRules.validateWithRule("boolean", value);
  },
  is: (value) => {
    return (typeof value !== "undefined" && value !== null);
  },
  required: (value) => {
    return ValidatorRules.validateWithRule("is", value) && value !== "";
  },
  string: (value) => {
    return (typeof value === "string");
  },
  username: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Za-z0-9]+(?:[ \._-][A-Za-z0-9]+)*$/);
  },
  password: (value, min = Validator.minPasswordSize, max = 50) => {
    return ValidatorRules.validateWithRule("string", value) && ValidatorRules.validateWithRule("size", value, min, max);
  },
  email: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^(([^<> ()[\].,;:\s@"]+(\.[^<> ()[\].,;:\s@"]+)*)|(".+"))@(([^<> ()[\].,;:\s@"]+\.)+[^<> ()[\].,;:\s@"]{2,})$/i);
  },
  tel: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[+]?[(]?[0-9]{3}[)]?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4,6}$/im);
  },
  country: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Z]{2}$/i);
  },
  language: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Z]{2}([-_][a-z]{2})?$/i);
  },
  bcrypt: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^\$2y\$.{56}$/);
  },
  guid: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  },
  mongoId: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[0-9a-fA-F]{24}$/);
  },
  object: (value) => {
    return (typeof value === "object" && !ValidatorRules.validateWithRule("array", value) && value !== null);
  },
  array: (value) => {
    return (value instanceof Array);
  },
  map: (value) => {
    return (value instanceof Map);
  },
  match: (value, ereg) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(ereg);
  },
  digits: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/[0-9]+/);
  },
  alpha: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/[A-Z]+/i);
  },
  digitsOnly: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[0-9]+$/);
  },
  alphaOnly: (value) => {
    return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Z]+$/i);
  },
  date: (value) => {
    if(value instanceof Date) {
      return true;
    }

    const timestamp = (typeof value === "number") ? (new Date(value)).getTime() : Date.parse(value);

    return (!isNaN(timestamp));
  },
  dateRange: (value, min = null, max = null) => {
    if(!ValidatorRules.validateWithRule("date", value)) {
      return false;
    }

    const date = new Date(value);

    if(min !== null) {
      min = new Date ();

      if(date < min) {
        return false;
      }
    }

    if(max !== null) {
      max = new Date ();

      if(date > max) {
        return false;
      }
    }

    return false;
  },
  notEmpty: (value) => {
    if(ValidatorRules.validateWithRule("map", value)) {
      return value.size > 0;
    }

    if(ValidatorRules.validateWithRule("array", value) || ValidatorRules.validateWithRule("string", value)) {
      return value.length > 0;
    }

    return !!value;
  },
  empty: (value) => {
    return !value;
  },
  range: (value, min = null, max = null) => {
    if(typeof value == "number") {
      if(min !== null && value < min) {
        return false;
      }

      if(max !== null && value > max) {
        return false;
      }

      return true;
    }

    return false;
  },
  size: (value, min = null, max = null) => {
    const len = value.length;

    if(typeof len == "number") {
      if(min !== null && len < min) {
        return false;
      }

      if(max !== null && len > max) {
        return false;
      }

      return true;
    }

    return false;
  },
  has: (value, val) => {
    if("has" in value && typeof value.has == "function") {
      return value.has(val);
    }

    if("indexOf" in value) {
      return (value.indexOf(val) > -1);
    }

    if(ValidatorRules.validateWithRule("object", value)) {
      return (val in value);
    }

    return false;
  },
  notIn: (value, ...args) => {
    let arr = args[0];

    if(!(arr instanceof Array)) {
      arr = args;
    }

    return (arr.indexOf(value) < 0);
  },
  in: (value, ...args) => {
    let arr = args[0];

    if(!(arr instanceof Array)) {
      arr = args;
    }

    return (arr.indexOf(value) > -1);
  }
});


export const validate = (name: string, ...args: any[]): boolean => {
  return ValidatorRules.validateWithRule(name, ...args);
};

export const checkIf = (value: any): Validator => {
  return new Validator(value);
};

