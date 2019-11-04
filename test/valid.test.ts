/// <reference types="chai" />
const expect = chai.expect;
import { Validator, ValidatorCheck, ValidatorRules, validate, checkIf } from "../src/valid.js";


describe("valid module", () => {

  describe("checkIf() string", () => {
    it("'Hello World!' is NOT numeric", async () => {
      expect(checkIf("Hello World!").numeric().isValid()).to.be.false;
    });
    it("'Hello World!' is NOT number", async () => {
      expect(checkIf("Hello World!").number().isValid()).to.be.false;
      expect(checkIf("Hello World!").num().isValid()).to.be.false;
    });
    it("'Hello World!' is NOT integer", async () => {
      expect(checkIf("Hello World!").integer().isValid()).to.be.false;
      expect(checkIf("Hello World!").int().isValid()).to.be.false;
    });
    it("'Hello World!' is NOT boolean", async () => {
      expect(checkIf("Hello World!").boolean().isValid()).to.be.false;
      expect(checkIf("Hello World!").bool().isValid()).to.be.false;
    });
    it("'Hello World!' is filled", async () => {
      expect(checkIf("Hello World!").required().isValid()).to.be.true;
    });
    it("Empty string is NOT filled", async () => {
      expect(checkIf("").required().isValid()).to.be.false;
    });
    it("'Hello World!' is string", async () => {
      expect(checkIf("Hello World!").string().isValid()).to.be.true;
    });
    it("'Hello World!' is NOT a valid username", async () => {
      expect(checkIf("Hello World!").username().isValid()).to.be.false;
    });
    it("'Hello.World' is a valid username", async () => {
      expect(checkIf("Hello.World").username().isValid()).to.be.true;
    });
    it("'Hello World!' is a valid password", async () => {
      expect(checkIf("Hello World!").password().isValid()).to.be.true;
    });
    it("'Hello!' is not a valid password", async () => {
      expect(checkIf("Hello!").password().isValid()).to.be.false;
    });
    it("'Hello World!' is not nil", async () => {
      expect(checkIf("Hello World!").is().isValid()).to.be.true;
    });
    it("'Hello World!' is NOT a valid email", async () => {
      expect(checkIf("Hello World!").email().isValid()).to.be.false;
    });
    it("'hello@world.com' is a valid email", async () => {
      expect(checkIf("hello@world.com").email().isValid()).to.be.true;
    });
    it("'Hello World!' is NOT a valid tel number", async () => {
      expect(checkIf("Hello World!").tel().isValid()).to.be.false;
    });
    it("'012-1235-555' is a valid tel numer", async () => {
      expect(checkIf("012-123-4555").tel().isValid()).to.be.true;
    });
    it("'Hello World!' is NOT a valid counstry code", async () => {
      expect(checkIf("Hello World!").country().isValid()).to.be.false;
    });
    it("'IT' is a valid counstry code", async () => {
      expect(checkIf("IT").country().isValid()).to.be.true;
    });
    it("'Hello World!' is NOT a valid language code", async () => {
      expect(checkIf("Hello World!").language().isValid()).to.be.false;
    });
    it("'it-IT' is a valid language code", async () => {
      expect(checkIf("it-IT").language().isValid()).to.be.true;
    });
    it("'Hello World!' is a NOT valid bcrypt string", async () => {
      expect(checkIf("Hello World!").bcrypt().isValid()).to.be.false;
    });
    it("'Hello World!' is a NOT valid guid string", async () => {
      expect(checkIf("Hello World!").guid().isValid()).to.be.false;
    });
  });

  // TODO: string number
  // TODO: number
  // TODO: number int
  // TODO: number float
  // TODO: boolean
  // TODO: array
  // TODO: object

});
