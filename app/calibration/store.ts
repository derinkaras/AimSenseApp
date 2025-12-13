import { create } from "zustand";
import { CalibrationResult, MountOrientation } from "./types";

type CalibState = {
    mountOrientation: MountOrientation;
    result: CalibrationResult | null;
    setMountOrientation: (o: MountOrientation) => void;
    setResult: (r: CalibrationResult | null) => void;
};

export const useCalibrationStore = create<CalibState>((set) => ({
    mountOrientation: "portrait",
    result: null,
    setMountOrientation: (o) => set({ mountOrientation: o }),
    setResult: (r) => set({ result: r }),
}));
