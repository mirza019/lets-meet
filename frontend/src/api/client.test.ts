import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { apiErrorMessage, client } from "./client";

describe("API reliability", () => {
  it("keeps the browser timeout above the SMTP timeout", () => {
    expect(client.defaults.timeout).toBeGreaterThan(30_000);
  });

  it("shows string API errors such as rate limits", () => {
    const error = new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
      data: { detail: "Easy there — try again in a minute. 🙂" },
      status: 429,
      statusText: "Too Many Requests",
      headers: {},
      config: {} as never,
    });
    expect(apiErrorMessage(error)).toBe("Easy there — try again in a minute. 🙂");
  });

  it("explains connection failures without blaming the calendar", () => {
    expect(apiErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toContain(
      "cannot reach the server",
    );
  });
});
