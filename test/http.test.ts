const mountDOM = require("jsdom-mount");
import { get, post } from "../src/http";

// TODO: mock global
(global as any).fetch = require("node-fetch");

describe("http module", () => {

  beforeAll(() => {
    mountDOM.default("<div></div>");
  });

  it("get request", async () => {
    const response = await get("https://cors-test.appspot.com/test", { parse: "json" });
    expect(response).toMatchObject({ "status":"ok" });
  });

  it("post request", async () => {
    const response = await post("https://cors-test.appspot.com/test", { parse: "json" });
    expect(response).toMatchObject({ "status":"ok" });
  });


});
