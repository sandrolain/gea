/// <reference types="chai" />
const expect = chai.expect;
import { get, post } from "../src/http.js";

describe("http module", () => {
  it("get json request", async () => {
    const response = await get("/assets/fetch.json", { parse: "json" });
    expect(response).to.be.eql({ status: "ok" });
  });

  it("CORS get request", async () => {
    const response = await get("https://cors-test.appspot.com/test", {
      parse: "json",
      mode: "cors"
    });
    expect(response).to.be.eql({ status: "ok" });
  });

  it("CORS post request", async () => {
    const response = await post("https://cors-test.appspot.com/test", {
      parse: "json",
      mode: "cors"
    });
    expect(response).to.be.eql({ status: "ok" });
  });
});
