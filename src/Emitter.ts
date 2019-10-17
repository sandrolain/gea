/* eslint @typescript-eslint/no-explicit-any: 0 */

type Subscriber = ((data: any) => void) | Emitter;

export class Emitter {
  private subscriptions: Set<Subscriber> = new Set();

  constructor (private processor = (data: any): void => data) {}

  subscribe (subscriber: Subscriber): void {
    this.subscriptions.add(subscriber);
  }

  unsubscribe (subscriber: Subscriber): void {
    this.subscriptions.delete(subscriber);
  }

  subscribed (subscriber: Subscriber): boolean {
    return this.subscriptions.has(subscriber);
  }

  subscribeTo (emitter: Emitter): void {
    return emitter.subscribe(this);
  }

  emit (data: any = null): void {
    const processedData = this.processor(data);
    for(const sub of this.subscriptions) {
      if(sub instanceof Emitter) {
        sub.emit(processedData);
      } else if(typeof sub === "function") {
        sub.call(this, processedData);
      }
    }
  }

  emitAll (dataList: any[]): void {
    for(const data of dataList) {
      this.emit(data);
    }
  }

  filter (filterFn: (data: any) => boolean): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      if(filterFn(data)) {
        emitter.emit(data);
      }
    });

    return emitter;
  }

  map (mapFn: (data: any) => any): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      const newData = mapFn(data);
      emitter.emit(newData);
    });

    return emitter;
  }

  reduce (reduceFn: (accumData: any, itemData: any) => any, accumData: any): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      const newData = reduceFn(accumData, data);
      accumData = newData;
      emitter.emit(newData);
    });

    return emitter;
  }

  delay (delay: number): Emitter {
    const emitter = new Emitter();

    this.subscribe((data: any) => {
      setTimeout(() => emitter.emit(data), delay);
    });

    return emitter;
  }

  debounce (releaseEmitter: Emitter): Emitter {
    const emitter = new Emitter();
    let ok: boolean = false;

    this.subscribe((data: any) => {
      if(ok) {
        emitter.emit(data);
        ok = false;
      }
    });

    releaseEmitter.subscribe(() => {
      ok = true;
    });

    return emitter;
  }

  debounceTime (time: number): Emitter {
    const emitter = new Emitter();
    let ok: boolean = false;
    let emitterTO: any;

    this.subscribe((data: any) => {
      if(ok) {
        emitter.emit(data);
        ok = false;
      }

      clearTimeout(emitterTO);

      emitterTO = setTimeout(() => (ok = true), time);
    });

    return emitter;
  }

  audit (releaseEmitter: Emitter): Emitter {
    const emitter = new Emitter();
    let lastData: any = null;

    this.subscribe((data: any) => {
      lastData = data;
    });

    releaseEmitter.subscribe(() => {
      emitter.emit(lastData);
    });

    return emitter;
  }

  auditTime (time: number): Emitter {
    const emitter = new Emitter();
    let lastData: any = undefined;
    let emitterTO: any;

    this.subscribe((data: any) => {
      lastData = data;

      clearTimeout(emitterTO);

      emitterTO = setTimeout(() => {
        if(lastData !== undefined) {
          emitter.emit(lastData);
        }
      }, time);
    });

    return emitter;
  }

  buffer (releaseEmitter: Emitter): Emitter {
    const emitter = new Emitter();
    let bufferData: any[] = [];

    this.subscribe((data: any) => {
      bufferData.push(data);
    });

    releaseEmitter.subscribe(() => {
      const outBuffer = bufferData;
      bufferData = [];
      emitter.emit(outBuffer);
    });

    return emitter;
  }

  static interval (interval: number): Emitter {
    const emitter = new Emitter();
    let times = 0;

    setInterval(() => {
      emitter.emit({
        times,
        interval
      });
      times++;
    }, interval);

    return emitter;
  }
}
