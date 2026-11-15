import { beforeEach, describe, expect, it, vi } from "vitest";
import { assignAdminChurch } from "@/lib/admin-church";

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { single, select, eq, update, from };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

describe("administrator church assignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates only the selected profile's church and confirms the saved value", async () => {
    mocks.single.mockResolvedValue({ data: { id: "admin-profile", church_id: "church-2" }, error: null });
    await expect(assignAdminChurch("admin-profile", "church-2")).resolves.toEqual({ id: "admin-profile", church_id: "church-2" });
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.update).toHaveBeenCalledWith({ church_id: "church-2" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "admin-profile");
  });

  it("requires a selected church before writing", async () => {
    await expect(assignAdminChurch("admin-profile", "")).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("reports permission failures instead of pretending the assignment succeeded", async () => {
    mocks.single.mockResolvedValue({ data: null, error: new Error("Permission denied") });
    await expect(assignAdminChurch("admin-profile", "church-2")).rejects.toThrow("Permission denied");
  });

  it("rejects a write that returns no updated profile", async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    await expect(assignAdminChurch("admin-profile", "church-2")).rejects.toThrow("not saved");
  });
});