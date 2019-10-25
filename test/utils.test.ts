/// <reference types="chai" />
const expect = chai.expect;
import * as utils from "../src/utils.js";

describe("utils module", () => {
  describe("utils.isObject", () => {
    it("utils.isObject simple", async () => {
      const value = { foo: "bar" };
      const result = utils.isObject(value);
      expect(result).is.equal(true);
    });

    it("utils.isObject constructor", async () => {
      const value = new Object();
      const result = utils.isObject(value);
      expect(result).is.equal(true);
    });

    it("utils.isObject string not an object", async () => {
      const value = "foo";
      const result = utils.isObject(value);
      expect(result).is.equal(false);
    });

    it("utils.isObject number not an object", async () => {
      const value = 123;
      const result = utils.isObject(value);
      expect(result).is.equal(false);
    });

    it("utils.isObject Array not an object", async () => {
      const value = ["foo", "bar"];
      const result = utils.isObject(value);
      expect(result).is.equal(false);
    });
  });

  describe("utils.mergeDeep", () => {
    it("simple merge with assign", async () => {
      const obj1 = { foo: "bar" };
      const obj2 = { hello: "world" };
      const result = utils.mergeDeep(obj1, obj2);
      expect(result).to.be.eql({ foo: "bar", hello: "world" });
      expect(obj1).is.equal(result);
    });
    it("depp merge with assign", async () => {
      const obj1 = { foo: { bar: 123 } };
      const obj2 = { hello: { who: "world" } };
      const result = utils.mergeDeep(obj1, obj2);
      expect(result).to.be.eql({ foo: { bar: 123 }, hello: { who: "world" } });
      expect(obj1).is.equal(result);
    });
    it("depp merge without assign", async () => {
      const obj1 = { foo: { bar: 123, arr: [1, 2, 3] } };
      const obj2 = { hello: { who: "world" } };
      const result = utils.mergeDeep({}, obj1, obj2);
      expect(result).to.be.eql({
        foo: { bar: 123, arr: [1, 2, 3] },
        hello: { who: "world" }
      });
      expect(obj1).is.not.equal(result);
      expect(obj1.foo).is.not.equal(result.foo);
      expect(obj1.foo.arr).is.equal(result.foo.arr);
    });
  });

  describe("utils.escapeRegExp", () => {
    it("test string escape", async () => {
      const value = utils.escapeRegExp("-[]{}()*+?.,\\^$|#");
      expect(value).to.be.equal(
        "\\-\\[\\]\\{\\}\\(\\)\\*\\+\\?\\.\\,\\\\\\^\\$\\|\\#"
      );
    });
  });
});
