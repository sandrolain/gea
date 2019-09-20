
export default class State
{
	constructor(state = {})
	{
		this.stateMap		= new Map();
		this.targets		= new Set();

		for(let key in state)
		{
			this.stateMap.set(key, state[key]);
		}

		this.stateProxy = new Proxy(this, {
			has: (target, name) =>
			{
				return this.stateMap.has(name);
			},
			get: (target, name) =>
			{
				if(name == "__is_state__")
				{
					return true;
				}

				if(name == "constructor")
				{
					return State;
				}
				else if(typeof this[name] == "function")
				{
					return this[name].bind(this);
				}

				return this.stateMap.get(name);
			},
			set: (target, name, value) =>
			{
				const newState = {};

				newState[name] = value;

				this.setState(newState);

				return true;
			},
			deleteProperty: (target, name) =>
			{
				return this.stateMap.delete(name);
			}
		});

		return this.stateProxy;
	}

	bindTarget(target)
	{
		this.targets.add(target);
	}

	unbindTarget(target)
	{
		this.targets.remove(target);
	}

	onChange(stateChange)
	{
		for(let target of this.targets)
		{
			if("onChange" in target)
			{
				target.onChange(stateChange);
			}
		}
	}

	setState(newState)
	{
		const keys		= [];
		const oldState	= {};

		for(let key in newState)
		{
			let oldValue = this.stateMap.get(key);

			// I verify that the value has changed, I only allow updates of the values actually changed
			if(oldValue !== newState[key])
			{
				oldState[key] = oldValue;

				this.stateMap.set(key, newState[key]);

				keys.push(key);
			}
		}

		// If there are changes I will fire the event
		if(keys.length > 0)
		{
			const stateChange = {
				keys,
				oldState
			};

			this.onChange(stateChange);

			return stateChange;
		}
	}

	getState(key, def = undefined)
	{
		if(key instanceof Array)
		{
			const res = {};

			for(let k in key)
			{
				res[k] = this.getState(k, def);
			}

			return res;
		}

		if(this.stateMap.has(key))
		{
			return this.stateMap.get(key);
		}

		return def;
	}

	getKeys()
	{
		return Array.from(this.stateMap.keys());
	}
}
