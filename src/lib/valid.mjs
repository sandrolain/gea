export class Validator
{
	constructor(value)
	{
		this.value	= value;
		this.checks	= [];

		const proxy = new Proxy(this, {
			has: (target, name) =>
			{
				if(name in target)
				{
					return true;
				}

				return !!ValidatorRules.getRule(name);
			},
			get: (target, name) =>
			{
				if(name in target)
				{
					return target[name];
				}

				return function()
				{
					const valid = ValidatorRules.validateWithRule(name, target.value, ...arguments);

					target.checks.push({
						rule: name,
						valid: valid
					});

					return this;
				};
			},
			set: (target, name, value) =>
			{
				if(name == "value")
				{
					this.value = value;
				}
			}
		});

		return proxy;
	}

	isValid()
	{
		return this.checks.reduce((prev, curr) =>
		{
			return prev && curr.valid;

		}, true);
	}

	notValid()
	{
		return !this.isValid();
	}

	getChecks()
	{
		return this.checks;
	}
}

export class ValidatorRules
{
	static getRulesMap()
	{
		if(!this.rulesMap)
		{
			this.rulesMap = new Map();
		}

		return this.rulesMap;
	}

	static setRules(rulesList)
	{
		for(const ruleName in rulesList)
		{
			this.setRule(ruleName, rulesList[ruleName]);
		}
	}

	static setRule(name, func)
	{
		this.getRulesMap().set(name, func);
	}

	static getRule(name)
	{
		return this.getRulesMap().get(name);
	}

	static validateWithRule(name, ...args)
	{
		const func =  this.getRule(name);

		if(func)
		{
			return !!func.apply(this, args);
		}

		return false;
	}
}


ValidatorRules.setRules({
	numeric: (value, base = 10) =>
	{
		return ValidatorRules.validateWithRule("number", value) || !isNaN(parseFloat(value, base || 10));
	},
	number: (value) =>
	{
		return (typeof value == "number" && !isNaN(value));
	},
	num: (value) =>
	{
		return ValidatorRules.validateWithRule("number", value);
	},
	integer: (value) =>
	{
		return (typeof value == "number" && value === parseInt(value, 10));
	},
	int: (value) =>
	{
		return ValidatorRules.validateWithRule("integer", value);
	},
	boolean: (value) =>
	{
		return (typeof value == "boolean");
	},
	bool: (value) =>
	{
		return ValidatorRules.validateWithRule("boolean", value);
	},
	is: (value) =>
	{
		return (typeof value != "undefined" && value !== null);
	},
	required: (value) =>
	{
		return ValidatorRules.validateWithRule("is", value) && value !== "";
	},
	string: (value) =>
	{
		return (typeof value == "string");
	},
	username: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/);
	},
	password: (value, min = null, max = 50) =>
	{
		if(min === null)
		{
			min = Validator.minPasswordSize || 10;
		}

		return ValidatorRules.validateWithRule("string", value) && ValidatorRules.validateWithRule("size", value, min, max);
	},
	email: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i);
	},
	tel: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[+]?[(]?[0-9]{3}[)]?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4,6}$/im);
	},
	country: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Z]{2}$/i);
	},
	language: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Z]{2}([-_][a-z]{2})?$/i);
	},
	bcrypt: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^\$2y\$.{56}$/);
	},
	guid: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	},
	mongoId: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[0-9a-fA-F]{24}$/);
	},
	object: (value) =>
	{
		return (typeof value == "object" && !ValidatorRules.validateWithRule("array", value) && value !== null);
	},
	array: (value) =>
	{
		return (value instanceof Array);
	},
	map: (value) =>
	{
		return (value instanceof Map);
	},
	match: (value, ereg) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(ereg);
	},
	digits: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/[0-9]+/);
	},
	alpha: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/[A-Z]+/i);
	},
	digitsOnly: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[0-9]+$/);
	},
	alphaOnly: (value) =>
	{
		return ValidatorRules.validateWithRule("string", value) && !!value.match(/^[A-Z]+$/i);
	},
	date: (value) =>
	{
		if(value instanceof Date)
		{
			return true;
		}

		var timestamp;

		if(typeof value == "number")
		{
			timestamp = (new Date(value)).getTime()
		}
		else
		{
			timestamp = Date.parse(value);
		}

		return (!isNaN(timestamp));
	},
	dateRange: (value, min = null, max = null) =>
	{
		if(!ValidatorRules.validateWithRule("date", value))
		{
			return false;
		}

		var date = new Date(value);

		if(min !== null)
		{
			min = new Date();

			if(date < min)
			{
				return false;
			}
		}

		if(max !== null)
		{
			max = new Date();

			if(date > max)
			{
				return false;
			}
		}

		return false;
	},
	notEmpty: (value) =>
	{
		if(ValidatorRules.validateWithRule("map", value))
		{
			return value.size > 0;
		}

		if(ValidatorRules.validateWithRule("array", value) || ValidatorRules.validateWithRule("string", value))
		{
			return value.length > 0;
		}

		return !!value;
	},
	empty: (value) =>
	{
		return !value;
	},
	range: (value, min = null, max = null) =>
	{
		if(typeof value == "number")
		{
			if(min !== null && value < min)
			{
				return false;
			}

			if(max !== null && value > max)
			{
				return false;
			}

			return true;
		}

		return false;
	},
	size: (value, min = null, max = null) =>
	{
		var len = value.length;

		if(typeof len == "number")
		{
			if(min !== null && len < min)
			{
				return false;
			}

			if(max !== null && len > max)
			{
				return false;
			}

			return true;
		}

		return false;
	},
	has: (value, val) =>
	{
		if("has" in value && typeof value.has == "function")
		{
			return value.has(val);
		}

		if("indexOf" in value)
		{
			return (value.indexOf(val) > -1);
		}

		if(ValidatorRules.validateWithRule("object", value))
		{
			return (val in value);
		}

		return false;
	},
	notIn: (value, ...args) =>
	{
		var arr = args[0];

		if(!(arr instanceof Array))
		{
			arr = args;
		}

		return (arr.indexOf(value) < 0);
	},
	in: (value, ...args) =>
	{
		var arr = args[0];

		if(!(arr instanceof Array))
		{
			arr = args;
		}

		return (arr.indexOf(value) > -1);
	}
});

export const validate = (...args) =>
{
	return ValidatorRules.validateWithRule(...args);
};

const checkIf = (value) =>
{
	return new Validator(value);
};

export default checkIf;
