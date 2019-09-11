import {forEach} from "./utils.mjs";
import Model from "./Model.mjs";

export default class Collection
{
	constructor(model = Model, items = [])
	{
		this.model	= model;
		this.items	= [];

		this.setItems(items);
	}

	setItems(items)
	{
		this.items = [];

		this.appendList(items);
	}

	appendItems(items)
	{
		forEach(items, (item) =>
		{
			this.items.push(this._toModel(item));
		});
	}


	getItemById(id)
	{
		return this.items.find((item) => item.get(this.model.idKey) === id);
	}

	setItemById(id, item)
	{
		const oldItem = this.getItemById(id);

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
	}

	addItem(item)
	{
		this.items.push(this._toModel(item));
	}

	_toModel(data)
	{
		return new this.model(data);
	}
}
