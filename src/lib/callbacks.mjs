
export class PhasedCallback
{
	constructor(callback, onError)
	{
		this.callback	= callback;
		this.onError	= onError || ((e) =>
		{
			console.error(e);
		});
	}

	call(bind, data)
	{
		const promise = new Promise((resolve, reject) =>
		{
			this.resolve	= resolve;
			this.reject		= reject;

		}).catch(this.onError);

		const result = this.callback.call(bind, data, this.resolve, this.reject);

		if(result === false)
		{
			this.resolve(false);

			return false;
		}

		return new PhasedResult(result, promise);
	}
}

export class PhasedResult
{
	constructor(result, promise)
	{
		this.result		= result;
		this.promise	= promise;
	}

	then(cb)
	{
		return this.promise.then(cb);
	}
}

export class ConditionalCallback
{
	constructor(condition, callback)
	{
		this.condition	= condition;
		this.callback	= callback;
	}

	call(bind, data)
	{
		const {keys} = data;

		if(typeof this.condition == "function")
		{
			if(!this.condition())
			{
				return false;
			}
		}
		else if(typeof this.condition == "string")
		{
			if(keys && !keys.includes(this.condition))
			{
				return false;
			}
		}
		else if(this.condition instanceof Array)
		{
			if(keys && this.condition.filter(x => keys.includes(x)).length < 1)
			{
				return false;
			}
		}

		return this.callback.call(bind, data);
	}
}
