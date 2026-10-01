import {
  getSalahHaloProps,
  salahStatusColorsHexCodes,
  showsSalahHalo,
} from "./constants";
import { SalahStatusType } from "../types/types";

describe("salah halo", () => {
  it("shows the halo for jamaah and for the female prayed status only", () => {
    const statuses: SalahStatusType[] = [
      "group",
      "female-alone",
      "male-alone",
      "late",
      "missed",
      "excused",
      "",
    ];
    expect(statuses.filter(showsSalahHalo)).toEqual(["group", "female-alone"]);
  });

  it("moves the fill colour into the halo layer for haloed statuses", () => {
    const { className, style } = getSalahHaloProps("group", "2026-09-30-Fajr");
    expect(className).toBe("salah-halo");
    expect(style).toMatchObject({
      backgroundColor: "transparent",
      "--halo-fill": salahStatusColorsHexCodes.group,
    });
  });

  it("returns no halo props for other statuses", () => {
    expect(getSalahHaloProps("male-alone", "2026-09-30-Fajr")).toEqual({
      className: "",
      style: {},
    });
  });

  it("gives each key a stable start offset inside one rotation", () => {
    const a = getSalahHaloProps("group", "2026-09-30-Fajr").style;
    const b = getSalahHaloProps("group", "2026-09-30-Fajr").style;
    const c = getSalahHaloProps("group", "2026-09-30-Dhuhr").style;
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);

    const delay = parseFloat(String(a["--halo-delay" as keyof typeof a]));
    expect(delay).toBeLessThanOrEqual(0);
    expect(delay).toBeGreaterThan(-4);
  });
});
