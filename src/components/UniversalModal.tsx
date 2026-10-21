import React, { ReactNode } from "react";
import { View, Modal, Pressable, KeyboardAvoidingView, Platform } from "react-native";

type universalModalProps = {
    visible: boolean;
    onClose: () => void;
    children: ReactNode;
    /** The content has text inputs: keep the card above the keyboard */
    avoidKeyboard?: boolean;
};

const UniversalModal = (props: universalModalProps) => {
    const { visible, onClose, children, avoidKeyboard = false } = props;
    return (
        <Modal visible={visible} transparent onRequestClose={onClose} animationType="fade">
            <KeyboardAvoidingView
                className="flex-1 justify-center items-center"
                behavior={avoidKeyboard && Platform.OS === "ios" ? "padding" : undefined}
                enabled={avoidKeyboard}
            >
                <Pressable onPress={onClose} className="absolute inset-0 bg-black/75" accessibilityLabel="Close" />
                <View
                    className="w-11/12 max-w-md bg-brand-black rounded-3xl p-6 border border-brand-green/60"
                    style={{
                        // Soft brand-green glow, like the tab bar
                        shadowColor: "#0b7f4f",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.25,
                        shadowRadius: 20,
                        elevation: 16,
                    }}
                >
                    {children}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default UniversalModal;
