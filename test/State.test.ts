/// <reference types="chai" />
const expect = chai.expect;
import { State, StateChange } from "../src/State.js";


describe("State module", () => {

  it("Set state with property name", async () => {
    const state = new State();
    state.foo = "bar";

    expect(state.getState("foo")).to.be.equal("bar");
  });

  it("Set state with setState method", async () => {
    const state = new State();
    state.setState({
      foo: "bar"
    });

    expect(state.getState("foo")).to.be.equal("bar");
  });

  it("Obtain state with property name", async () => {
    const state = new State();
    state.setState({
      foo: "bar"
    });

    expect(state.foo).to.be.equal("bar");
  });

  it("Obtain state with property name", async () => {
    const state = new State();
    state.setState({
      foo: "bar",
      hello: "world"
    });

    expect(state.getKeys()).to.be.contains.members(["foo", "hello"]);
  });

  it("Bind target with callback function", (done) => {
    const state = new State();

    state.setState({
      foo: "bar",
      hello: "world"
    });

    state.bindTarget((stateChange: StateChange) => {
      expect(stateChange.keys).to.be.contains("foo");
      expect(stateChange.oldState.foo).to.be.equal("bar");
      expect(state.foo).to.be.equal(123);
      done();
    });

    state.setState({
      foo: 123
    });
  });

  it("Bind target with obj.onStateChange", (done) => {
    const state = new State();

    state.setState({
      foo: "bar",
      hello: "world"
    });

    state.bindTarget({
      onStateChange: (stateChange) => {
        expect(stateChange.keys).to.be.contains("foo");
        expect(stateChange.oldState.foo).to.be.equal("bar");
        expect(state.foo).to.be.equal(123);
        done();
      }
    });

    state.setState({
      foo: 123
    });
  });

  it("Unbind target with callback function", (done) => {
    const state = new State();

    state.setState({
      foo: "bar",
      hello: "world"
    });

    let receivedValue: any;

    const fn = (stateChange) => {
      receivedValue = stateChange;
    };

    state.bindTarget(fn);

    state.setState({
      foo: 123
    });

    state.unbindTarget(fn);

    state.setState({
      foo: 456,
      hello: "test"
    });

    setTimeout(() => {
      expect(receivedValue.keys).to.be.eql(["foo"]);
      expect(receivedValue.oldState.foo).to.be.equal("bar");
      done();

    }, 500)
  });


});
