
export interface StateChange {
  keys: string[];
  oldState: Record<string, any>;
}

export class State {
  protected stateMap: Map<string, any>;
  protected targets: Set<any>;

  constructor (state: Record<string, any> = {}) {
    this.stateMap = new Map();
    this.targets  = new Set();

    for(const key in state) {
      this.stateMap.set(key, state[key]);
    }

    const stateProxy = new Proxy(this, {
      has: (target, name: string): boolean => {
        return this.stateMap.has(name);
      },
      get: (target, name: string): any => {
        if(name === "__is_state__") {
          return true;
        }

        if(name === "constructor") {
          return State;
        } else if(typeof (this as Record<string, any>)[name] === "function") {
          return (this as Record<string, any>)[name].bind(this);
        }

        return this.stateMap.get(name);
      },
      set: (target, name: string, value: any): boolean => {
        const newState: Record<string, any> = {};

        newState[name] = value;

        this.setState(newState);

        return true;
      },
      deleteProperty: (target, name: string): boolean => {
        return this.stateMap.delete(name);
      }
    });

    return stateProxy;
  }

  bindTarget (target: any): void {
    this.targets.add(target);
  }

  unbindTarget (target: any): void {
    this.targets.delete(target);
  }

  private onChange (stateChange: StateChange): void {
    for(const target of this.targets) {
      if(typeof target === "function") {
        target.call(this, stateChange);
      } else if("onStateChange" in target) {
        target.onStateChange(stateChange);
      }
    }
  }

  setState (newState: Record<string, any>): StateChange {
    const keys: string[] = [];
    const oldState: Record<string, any> = {};

    for(const key in newState) {
      const oldValue = this.stateMap.get(key);

      // I verify that the value has changed, I only allow updates of the values actually changed
      if(oldValue !== newState[key]) {
        oldState[key] = oldValue;

        this.stateMap.set(key, newState[key]);

        keys.push(key);
      }
    }

    const stateChange = {
      keys,
      oldState
    };

    // If there are changes I will fire the event
    if(keys.length > 0) {
      this.onChange(stateChange);
    }

    return stateChange;
  }

  getState (key: string | string[], def: any = undefined): any | Record<string, any> {
    if(key instanceof Array) {
      const res: Record<string, any> = {};

      for(const k in key) {
        res[k] = this.getState(k, def);
      }

      return res;
    }

    if(this.stateMap.has(key)) {
      return this.stateMap.get(key);
    }

    return def;
  }

  getKeys (): string[] {
    return Array.from(this.stateMap.keys());
  }
}
