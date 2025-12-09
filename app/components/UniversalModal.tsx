import React, {ReactNode} from 'react';
import {View, Text, Modal, Pressable} from 'react-native';

type universalModalProps = {
    visible: boolean;
    onClose: () => void;
    children: ReactNode
}

const UniversalModal = (props :universalModalProps) => {
    const {visible, onClose, children} = props;
    return (
        <Modal
            visible={visible}
            transparent
            onRequestClose={onClose}
            animationType="fade"
        >
            <View className="flex-1 justify-center items-center">

                <Pressable
                    onPress={onClose}
                    className="absolute inset-0 bg-black opacity-70"
                />
                <View
                    className="w-11/12 max-w-md bg-brand-black rounded-3xl p-8 shadow-2xl border-2 border-brand-greenDark"
                >
                    {children}
                </View>
            </View>


        </Modal>

    );
};

export default UniversalModal;
