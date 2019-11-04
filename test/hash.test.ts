/// <reference types="chai" />
const expect = chai.expect;
import { md5, sha1, sha256, sha384, sha512 } from "../src/hash.js";


describe("hash module", () => {

  it("md5()", async () => {
    const value = await md5("Hello World!");
    expect(value).to.be.equal("ed076287532e86365e841e92bfc50d8c");
  });

  it("sha1()", async () => {
    const value = await sha1("Hello World!");
    expect(value).to.be.equal("2ef7bde608ce5404e97d5f042f95f89f1c232871");
  });

  it("sha256()", async () => {
    const value = await sha256("Hello World!");
    expect(value).to.be.equal("7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069");
  });

  it("sha384()", async () => {
    const value = await sha384("Hello World!");
    expect(value).to.be.equal("bfd76c0ebbd006fee583410547c1887b0292be76d582d96c242d2a792723e3fd6fd061f9d5cfd13b8f961358e6adba4a");
  });

  it("sha512()", async () => {
    const value = await sha512("Hello World!");
    expect(value).to.be.equal("861844d6704e8573fec34d967e20bcfef3d424cf48be04e6dc08f2bd58c729743371015ead891cc3cf1c9d34b49264b510751b1ff9e537937bc46b5d6ff4ecc8");
  });

});
