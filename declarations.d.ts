// For SVGs
declare module "*.svg" {
    import * as React from "react";
    import { SvgProps } from "react-native-svg";
    const content: React.FC<SvgProps>;
    export default content;
}

// For PNGs, JPGs, etc.
declare module "*.png" {
    const value: number; // or string, but Expo uses numeric asset references
    export default value;
}

declare module "*.jpg" {
    const value: number;
    export default value;
}

declare module "*.jpeg" {
    const value: number;
    export default value;
}

declare module "*.gif" {
    const value: number;
    export default value;
}
