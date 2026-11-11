import { beforeAll, describe, expect, it } from "vitest";
import { setupTestApp } from "./helpers";
let t: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => {
  t = await setupTestApp();
});
describe("autorização", () => {
  it("nenhuma variação de rota privada responde dados sem sessão", async () => {
    const paths = [
      "/appointments",
      "/appointments/",
      "/appointments/00000000-0000-0000-0000-000000000000",
      "/appointments?x=1",
      "/dashboard/",
      "/settings",
      "/services/",
      "/availability?date=2030-01-07",
      "/appointments/%2e%2e/dashboard",
      "/./dashboard",
      "/auth/me/",
      "/Appointments",
    ];
    for (const p of paths) {
      const res = await t.app.request(`/api${p}`);
      expect([401, 404], `${p} -> ${res.status}`).toContain(res.status);
    }
    for (const [m, p] of [
      ["POST", "/appointments"],
      ["PUT", "/settings"],
      ["PATCH", "/services/x"],
      ["DELETE", "/appointments/x"],
      ["POST", "/auth/password"],
    ] as const) {
      const res = await t.app.request(`/api${p}`, {
        method: m,
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
        },
        body: "{}",
      });
      expect([401, 404], `${m} ${p} -> ${res.status}`).toContain(res.status);
    }
  });
});
