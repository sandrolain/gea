
export default class EventsManager
{
	constructor()
	{
		this.eventsListeners	= new Map();
	}

	getEventListeners(type)
	{
		if(!this.eventsListeners.has(type))
		{
			this.eventsListeners.set(type, []);
		}

		return this.eventsListeners.get(type);
	}

	hasEventListeners(type)
	{
		return this.eventsListeners.has(type);
	}

	addEventListener(type, callback)
	{
		const callbacksList = this.getEventListeners(type);

		callbacksList.push(callback);

		return this;
	}

	addEventListeners(type, callbacks)
	{
		for(let callback of callbacks)
		{
			this.addEventListener(type, callback);
		}

		return this;
	}

	onceEventListener(type, callback)
	{
		const onceCallback = function()
		{
			this.removeEventListener(type, callback);

			return this._fireListener(type, callback, arguments);
		};

		onceCallback.callback = callback;

		this.addEventListener(type, onceCallback);

		return this;
	}

	removeEventListener(type, callback)
	{
		const callbacksList	= this.getEventListeners(type);
		const index			= callbacksList.indexOf(callback);

		if(index > -1)
		{
			callbacksList.splice(index, 1);
		}

		if(callbacksList.length < 1)
		{
			this.removeAllEventListeners(type);
		}

		return this;
	}

	removeAllEventListeners(type)
	{
		this.eventsListeners.delete(type);

		return this;
	}

	fireEvent(type, ...args)
	{
		const callbacksList = this.eventsListeners.get(type);

		if(callbacksList)
		{
			for(let callback of callbacksList)
			{
				this._fireListener(type, callback, args);
			}
		}
	}

	_fireListener(type, callback, args)
	{
		if(typeof callback == "function")
		{
			callback.apply(this, args);
		}
		else
		{
			const ontype = `on${type}`;

			if(ontype in callback)
			{
				callback[ontype](...args);
			}

			if(callback.fireEvent)
			{
				callback.fireEvent(type, ...args);
			}
		}
	}
}