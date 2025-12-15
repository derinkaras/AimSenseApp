// app/contexts/GunProfilesDirtyContext.tsx
import React, { createContext, useContext, useRef } from "react";

type DirtyCtx = {
    markDirty: () => void;
    consumeDirty: () => boolean;
};

const GunProfilesDirtyContext = createContext<DirtyCtx | null>(null);

export const GunProfilesDirtyProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                                      children,
                                                                                  }) => {
    const dirtyRef = useRef(false);

    const markDirty = () => {
        dirtyRef.current = true;
    };

    const consumeDirty = () => {
        if (dirtyRef.current) {
            dirtyRef.current = false;
            return true;
        }
        return false;
    };

    return (
        <GunProfilesDirtyContext.Provider value={{ markDirty, consumeDirty }}>
            {children}
        </GunProfilesDirtyContext.Provider>
    );
};

export const useGunProfilesDirty = () => {
    const ctx = useContext(GunProfilesDirtyContext);
    if (!ctx) {
        throw new Error("useGunProfilesDirty must be used within provider");
    }
    return ctx;
};
