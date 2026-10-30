import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../client";
import { ContentTypeAdminService } from "./content-type.service";

vi.mock("../client", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe("ContentTypeAdminService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envia o contexto atual para o manager passar no content-type:manage", async () => {
    await ContentTypeAdminService.create({ name: "Vídeo" }, 7);
    await ContentTypeAdminService.update(2, { name: "Vídeos" }, 7);
    await ContentTypeAdminService.delete(2, 7);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/admin/content-types",
      { name: "Vídeo" },
      { params: { contextId: 7 } },
    );
    expect(apiClient.put).toHaveBeenCalledWith(
      "/admin/content-types/2",
      { name: "Vídeos" },
      { params: { contextId: 7 } },
    );
    expect(apiClient.delete).toHaveBeenCalledWith("/admin/content-types/2", {
      params: { contextId: 7 },
    });
  });

  it("sem contexto não envia contextId", async () => {
    await ContentTypeAdminService.update(2, { name: "Vídeos" });

    expect(apiClient.put).toHaveBeenCalledWith(
      "/admin/content-types/2",
      { name: "Vídeos" },
      { params: undefined },
    );
  });
});
