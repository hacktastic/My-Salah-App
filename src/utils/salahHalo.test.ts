import {
  getSalahHaloProps,
  salahStatusColorsHexCodes,
  showsSalahHalo,
  syncSalahHaloAnimations,
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
    const { className, style } = getSalahHaloProps("group");
    expect(className).toBe("salah-halo");
    expect(style).toEqual({
      backgroundColor: "transparent",
      "--halo-fill": salahStatusColorsHexCodes.group,
    });
  });

  it("returns no halo props for other statuses", () => {
    expect(getSalahHaloProps("male-alone")).toEqual({
      className: "",
      style: {},
    });
  });

  describe("syncSalahHaloAnimations", () => {
    const originalGetAnimations = document.getAnimations;
    afterEach(() => {
      document.getAnimations = originalGetAnimations;
    });

    const stubAnimations = (
      animations: { animationName?: string; startTime: number | null }[]
    ) => {
      document.getAnimations = () => animations as unknown as Animation[];
      return animations;
    };

    it("pins every halo animation to the timeline origin", () => {
      const [spinA, spinB, orbit, other, transition] = stubAnimations([
        { animationName: "salah-halo-spin", startTime: 1234 },
        { animationName: "salah-halo-spin", startTime: 5678 },
        { animationName: "salah-halo-orbit", startTime: 910 },
        { animationName: "animate-bounce", startTime: 42 },
        { startTime: 7 },
      ]);

      syncSalahHaloAnimations({
        animationName: "salah-halo-spin",
      } as AnimationEvent);

      expect(spinA.startTime).toBe(0);
      expect(spinB.startTime).toBe(0);
      expect(orbit.startTime).toBe(0);
      expect(other.startTime).toBe(42);
      expect(transition.startTime).toBe(7);
    });

    it("ignores animation events that are not halos", () => {
      const [spin] = stubAnimations([
        { animationName: "salah-halo-spin", startTime: 1234 },
      ]);

      syncSalahHaloAnimations({
        animationName: "animate-bounce",
      } as AnimationEvent);

      expect(spin.startTime).toBe(1234);
    });
  });
});
