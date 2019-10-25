/// <reference types="chai" />
const expect = chai.expect;
import { Emitter } from "../src/Emitter.js";

describe("Emitter module", () => {
  it("emit with callback", done => {
    const subject = new Emitter();

    subject.subscribe(data => {
      expect(data).to.be.eql({ foo: "bar" });
      done();
    });

    subject.emit({
      foo: "bar"
    });
  });

  it("chain emit with callback", done => {
    const subjectA = new Emitter();
    const subjectB = new Emitter();

    subjectB.subscribe(data => {
      expect(data).to.be.eql({ foo: "bar" });
      done();
    });

    subjectA.subscribe(subjectB);

    subjectA.emit({
      foo: "bar"
    });
  });

  it("emit with promise", done => {
    const subject = new Emitter();

    const prom = subject.promise();

    prom.then(data => {
      expect(data).to.be.eql({ foo: "bar" });
      done();
    });

    subject.emit({
      foo: "bar"
    });
  });

  it("emitAll() with callback", done => {
    const subject = new Emitter();

    const passedData = [];

    subject.subscribe(data => {
      passedData.push(data);
    });

    subject.emitAll([
      {
        foo: "foo"
      },
      {
        foo: "bar"
      },
      {
        bar: "foo"
      }
    ]);

    setTimeout(() => {
      expect(passedData.length).to.be.equal(3);
      expect(passedData).to.be.eql([
        {
          foo: "foo"
        },
        {
          foo: "bar"
        },
        {
          bar: "foo"
        }
      ]);
      done();
    }, 1000);
  });

  it("emitInterval() with callback", done => {
    const subject = new Emitter();

    const passedData = [];

    subject.subscribe(data => {
      passedData.push(data);
    });

    subject.emitInterval(0, 100, 5);

    setTimeout(() => {
      expect(passedData.length).to.be.equal(5);
      expect(passedData.pop()).to.be.eql({
        times: 5,
        delay: 0,
        interval: 100,
        maxTimes: 5
      });
      done();
    }, 1000);
  });

  it("filter()", done => {
    const subject = new Emitter();

    const passedData = [];

    subject
      .filter(data => data.foo === "bar")
      .subscribe(data => {
        passedData.push(data);
      });

    subject.emitAll([
      {
        foo: "foo"
      },
      {
        foo: "bar"
      },
      {
        bar: "foo"
      }
    ]);

    setTimeout(() => {
      expect(passedData.length).to.be.equal(1);
      expect(passedData[0]).to.be.eql({ foo: "bar" });
      done();
    }, 1000);
  });

  it("map()", done => {
    const subject = new Emitter();

    const passedData = [];

    subject
      .map(data => data.value)
      .subscribe(data => {
        passedData.push(data);
      });

    subject.emitAll([
      {
        value: 4
      },
      {
        value: 8
      },
      {
        value: 15
      },
      {
        value: 16
      }
    ]);

    setTimeout(() => {
      expect(passedData.length).to.be.equal(4);
      expect(passedData).to.be.eql([4, 8, 15, 16]);
      done();
    }, 1000);
  });

  it("reduce()", done => {
    const subject = new Emitter();

    let latestData;

    subject
      .reduce((accum, data) => {
        return accum + data.value;
      }, 0)
      .subscribe(data => {
        latestData = data;
      });

    subject.emitAll([
      {
        value: 4
      },
      {
        value: 8
      },
      {
        value: 15
      },
      {
        value: 16
      }
    ]);

    setTimeout(() => {
      expect(latestData).to.be.equal(43);
      done();
    }, 1000);
  });

  it("delay()", done => {
    const subject = new Emitter();

    let latestData = 0;

    subject.delay(1000).subscribe(data => {
      latestData = data;
    });

    subject.emit(42);

    setTimeout(() => {
      expect(latestData).to.be.equal(0);

      setTimeout(() => {
        expect(latestData).to.be.equal(42);
        done();
      }, 1000);
    }, 500);
  });

  it("buffer()", done => {
    const subject = new Emitter();
    const releaser = new Emitter();

    let latestData = null;

    subject.buffer(releaser).subscribe(data => {
      latestData = data;
    });

    subject.emit(4);
    setTimeout(() => {
      subject.emit(8);
    }, 100);
    setTimeout(() => {
      subject.emit(15);
    }, 200);
    setTimeout(() => {
      subject.emit(16);
    }, 300);

    setTimeout(() => {
      releaser.emit();
    }, 1000);

    setTimeout(() => {
      expect(latestData).to.be.equal(null);

      setTimeout(() => {
        expect(latestData).to.be.eql([4, 8, 15, 16]);
        done();
      }, 1000);
    }, 500);
  });

  it("audit()", done => {
    const subject = new Emitter();
    const releaser = new Emitter();

    let latestData = null;

    subject.audit(releaser).subscribe(data => {
      latestData = data;
    });

    subject.emit(4);
    setTimeout(() => {
      subject.emit(8);
    }, 100);
    setTimeout(() => {
      subject.emit(15);
    }, 200);
    setTimeout(() => {
      subject.emit(16);
    }, 300);

    setTimeout(() => {
      releaser.emit();
    }, 1000);

    setTimeout(() => {
      expect(latestData).to.be.equal(null);

      setTimeout(() => {
        expect(latestData).to.be.eql(16);
        done();
      }, 1000);
    }, 500);
  });

  it("auditTime()", done => {
    const subject = new Emitter();

    let latestData = null;

    subject.auditTime(1000).subscribe(data => {
      latestData = data;
    });

    subject.emit(4);
    setTimeout(() => {
      subject.emit(8);
    }, 100);
    setTimeout(() => {
      subject.emit(15);
    }, 200);
    setTimeout(() => {
      subject.emit(16);
    }, 300);

    setTimeout(() => {
      expect(latestData).to.be.equal(null);

      setTimeout(() => {
        expect(latestData).to.be.eql(16);
        done();
      }, 1000);
    }, 500);
  });
});
