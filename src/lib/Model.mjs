import {forEach, mapToObject} from "./utils.mjs";

export default class Model
{
	constructor(data = {})
	{
		this.idKey	= "id";
		this.data	= new Map();

		this.setData(data);
	}

	setData(data = {})
	{
		if(data instanceof Model)
		{
			data = data.toMap();
		}

		forEach(data, (value, key) =>
		{
			this.data.set(key, value);
		});
	}

	get(key)
	{
		return this.data.get(key);
	}

	set(key, value)
	{
		return this.data.set(key, value);
	}

	toMap()
	{
		return new Map(this.data);
	}

	toJSON()
	{
		const data = mapToObject(this.data);

		return JSON.stringify(data);
	}
}
