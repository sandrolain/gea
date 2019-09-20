import {forEach, mapToObject} from "./utils.mjs";

export default class Model
{
	constructor(data = {})
	{
		this.data	= new Map();

		this.setData(data);
	}

	setData(data = {})
	{
		if(data instanceof Model)
		{
			this.data = data.toMap();
		}
		else
		{
			forEach(data, (value, key) =>
			{
				this.data.set(key, value);
			});
		}
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

	get id()
	{
		return this.get(this.constructor.idKey);
	}

	get idKey()
	{
		return this.constructor.idKey;
	}

	static get idKey()
	{
		return "id";
	}

	static isValue(value)
	{
		return (value !== null && value !== undefined);
	}
}


export class Collection
{
	constructor(items = [])
	{
		this.items		= [];
		this.idIndex	= new Map();

		this.setItems(items);
	}

	get model()
	{
		return Model;
	}

	cancelRebuildIdIndex()
	{
		if(this.rebuildIndexTO)
		{
			clearTimeout(this.rebuildIndexTO);

			this.rebuildIndexTO = null;
		}
	}

	requestRebuildIdIndex()
	{
		this.cancelRebuildIdIndex();

		this.idIndex = null;

		this.rebuildIndexTO = setTimeout(() =>
		{
			this.rebuildIdIndex();
		}, 100);
	}

	rebuildIdIndex()
	{
		this.cancelRebuildIdIndex();

		if(!this.idIndex)
		{
			this.idIndex = new Map();
			const idKey	= this.model.idKey;

			this.items.forEach((item) =>
			{
				const idValue = item.get(idKey);

				if(Model.isValue(idValue))
				{
					this.idIndex.set(idValue, item);
				}
			});
		}
	}

	setItems(items)
	{
		this.items = [];

		this.appendItems(items);
	}

	appendItems(items)
	{
		forEach(items, (item) =>
		{
			this.items.push(this._toModel(item));
		});

		this.requestRebuildIdIndex();
	}


	getItemById(id)
	{
		this.rebuildIdIndex();

		return this.idIndex.get(id);
	}

	setItemById(item)
	{
		this.rebuildIdIndex();

		const oldItem = this.getItemById(item.id);

		if(oldItem)
		{
			const index = this.items.indexOf(oldItem);

			return this.setItemByIndex(index, item);
		}

		this.addItem(item);
	}

	getItemByIndex(index)
	{
		return this.items[+index];
	}

	setItemByIndex(index, item)
	{
		this.items[+index] = this._toModel(item);

		this.requestRebuildIdIndex();
	}

	addItem(item)
	{
		this.items.push(this._toModel(item));

		this.requestRebuildIdIndex();
	}

	filter(fn)
	{
		const items = this.items.slice(0).filter(fn);

		return new this.constructor(items);
	}

	slice(start = 0, end)
	{
		const items = this.items.slice(start, end);

		return new this.constructor(items);
	}

	sort(field, desc = false)
	{
		const items = this.items.slice(0);

		items.sort((a, b) =>
		{
			const aVal = a.get(field);
			const bVal = b.get(field);

			if(aVal === bVal)
			{
				return 0;
			}

			if(desc)
			{
				return aVal > bVal ? -1 : 1;
			}

			return aVal < bVal ? -1 : 1;
		});

		return new this.constructor(items);
	}

	_toModel(data)
	{
		return new this.model(data);
	}
}
