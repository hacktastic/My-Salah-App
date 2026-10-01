import { describe, expect, it, vi } from "vitest";
import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { addMissingLocationColumns } from "./dbUtils";

const mockDb = (columnNames: string[]) =>
  ({
    query: vi
      .fn()
      .mockResolvedValue({ values: columnNames.map((name) => ({ name })) }),
    execute: vi.fn().mockResolvedValue(undefined),
  }) as unknown as SQLiteDBConnection & {
    execute: ReturnType<typeof vi.fn>;
  };

const originalColumns = [
  "id",
  "locationName",
  "latitude",
  "longitude",
  "isSelected",
];

describe("addMissingLocationColumns", () => {
  it("adds both columns to a table from an older install", async () => {
    const db = mockDb(originalColumns);

    await addMissingLocationColumns(db);

    expect(db.execute).toHaveBeenCalledWith(
      "ALTER TABLE userLocationsTable ADD COLUMN isCurrentLocation INTEGER NOT NULL DEFAULT 0",
    );
    expect(db.execute).toHaveBeenCalledWith(
      "ALTER TABLE userLocationsTable ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''",
    );
  });

  it("does nothing when the columns already exist", async () => {
    const db = mockDb([...originalColumns, "isCurrentLocation", "updatedAt"]);

    await addMissingLocationColumns(db);

    expect(db.execute).not.toHaveBeenCalled();
  });
});
