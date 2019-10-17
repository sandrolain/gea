
export class PhasedResult {
  constructor (public result: any, public promise: Promise<any>) {
  }

  async then (cb: (data: any) => any): Promise<any> {
    return cb(await this.promise);
  }
}

export class PhasedCallback {
  private resolve: (data: any) => any;
  private reject: () => any;

  constructor (
    public callback: (data: any, resolve: () => any, reject: () => any) => any,
    public onError: (error: Error) => any = (e: Error): void => console.error(e)
  ) {
  }

  call (bind: any, data: any): PhasedResult | false {
    const promise = new Promise((resolve, reject): void => {
      this.resolve  = resolve;
      this.reject    = reject;

    }).catch(this.onError);

    const result = this.callback.call(bind, data, this.resolve, this.reject);

    if(result === false) {
      this.resolve(false);
      return false;
    }

    return new PhasedResult(result, promise);
  }
}


export class ConditionalCallback {
  constructor (
    private condition: any,
    private callback: (data: any, resolve: () => any, reject: () => any) => any
  ) {
  }

  call (bind: any, data: any): any {
    const { keys } = data;

    if(typeof this.condition === "function") {
      if(!this.condition()) {
        return false;
      }
    } else if(typeof this.condition === "string") {
      if(keys && !keys.includes(this.condition)) {
        return false;
      }
    } else if(this.condition instanceof Array) {
      if(keys && this.condition.filter(x => keys.includes(x)).length < 1) {
        return false;
      }
    }

    return this.callback.call(bind, data);
  }
}
