/* eslint @typescript-eslint/no-explicit-any: 0 */

import { forEach, mapToObject } from "./utils";

export type ModelData = Record<string, any> | Model;
export type ModelClass = new(data?: ModelData) => Model;

export default class Model {
  protected data: Map<string, any> = new Map();

  constructor (data: ModelData = {}) {
    this.setData(data);
  }

  setData (data = {}): void {
    if(data instanceof Model) {
      this.data = data.toMap();
    } else {
      forEach(data, (value: any, key: string) => {
        this.data.set(key, value);
      });
    }
  }

  get (key: string): any {
    return this.data.get(key);
  }

  set (key: string, value: any): Map<string, any> {
    return this.data.set(key, value);
  }

  toMap (): Map<string, any> {
    return new Map(this.data);
  }

  toJSON (): string {
    const data = mapToObject(this.data);

    return JSON.stringify(data);
  }

  get id (): string {
    return this.get((this.constructor as any).idKey);
  }

  get idKey (): string {
    return (this.constructor as any).idKey;
  }

  static readonly idKey = "id";

  static isValue (value: any): boolean {
    return (value !== null && value !== undefined);
  }
}


export class Collection {
  protected idIndex: Map<string, Model> = new Map();
  protected rebuildIndexTO: number;

  constructor (protected items: any[] | Model[] = []) {
    this.setItems(items);
  }

  get model (): ModelClass {
    return Model;
  }

  cancelRebuildIdIndex (): void {
    if(this.rebuildIndexTO) {
      clearTimeout(this.rebuildIndexTO);

      this.rebuildIndexTO = null;
    }
  }

  requestRebuildIdIndex (): void {
    this.cancelRebuildIdIndex();

    this.idIndex = null;

    this.rebuildIndexTO = window.setTimeout(() => {
      this.rebuildIdIndex();
    }, 100);
  }

  rebuildIdIndex (): void {
    this.cancelRebuildIdIndex();

    if(!this.idIndex) {
      this.idIndex = new Map();
      const idKey  = (this.model as any).idKey;

      this.items.forEach((item) => {
        const idValue = item.get(idKey);

        if(Model.isValue(idValue)) {
          this.idIndex.set(idValue, item);
        }
      });
    }
  }

  setItems (items: any[]): void {
    this.items = [];

    this.appendItems(items);
  }

  appendItems (items: any[]): void {
    forEach(items, (item: any) => {
      this.items.push(this._toModel(item));
    });

    this.requestRebuildIdIndex();
  }


  getItemById (id: string): Model {
    this.rebuildIdIndex();

    return this.idIndex.get(id);
  }

  setItemById (item: Model): void {
    this.rebuildIdIndex();

    const oldItem = this.getItemById(item.id);

    if(oldItem) {
      const index = this.items.indexOf(oldItem);

      return this.setItemByIndex(index, item);
    }

    this.addItem(item);
  }

  getItemByIndex (index: number): Model {
    return this.items[+index];
  }

  setItemByIndex (index: number, item: any): void {
    this.items[+index] = this._toModel(item);

    this.requestRebuildIdIndex();
  }

  addItem (item: any): void {
    this.items.push(this._toModel(item));

    this.requestRebuildIdIndex();
  }

  filter (fn: (value: Model, index: number) => boolean): Collection {
    const items = this.items.slice(0).filter(fn);

    return new (this.constructor as any)(items);
  }

  slice (start: number = 0, end: number = null): Collection {
    const items = this.items.slice(start, end);

    return new (this.constructor as any)(items);
  }

  sort (field: string, desc: boolean = false): Collection {
    const items = this.items.slice(0);

    items.sort((a, b) => {
      const aVal = a.get(field);
      const bVal = b.get(field);

      if(aVal === bVal) {
        return 0;
      }

      if(desc) {
        return aVal > bVal ? -1 : 1;
      }

      return aVal < bVal ? -1 : 1;
    });

    return new (this.constructor as any)(items);
  }

  _toModel (data: ModelData): Model {
    return new this.model(data);
  }
}
