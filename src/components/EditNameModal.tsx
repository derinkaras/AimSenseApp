import React, {useEffect, useState} from 'react';
import {View, Text, Modal, Pressable, TextInput, TouchableOpacity} from 'react-native';
import Toast from "react-native-toast-message";

type editNameModalProps = {
    showEditNameModal: boolean;
    onClose: () => void;
    firstName: string;
    lastName: string;
    setFirstName: (name: string) => void;
    setLastName: (name: string) => void;
    handleSave: (firstName: string, lastName: string) => void;

}

const EditNameModal = (props: editNameModalProps) => {
    const { showEditNameModal, onClose, setFirstName,
        setLastName, firstName, lastName, handleSave: saveInDb
    } = props;
    const [newFirstName, setNewFirstName] = useState(firstName);
    const [newLastName, setNewLastName] = useState(lastName);

    useEffect(() => {
        setNewFirstName(firstName);
        setNewLastName(lastName);
    }, [firstName, lastName])


    const handleSave = () => {
        setFirstName(newFirstName);
        setLastName(newLastName);
        saveInDb(newFirstName, newLastName);
        onClose();
    }

    return (
        <Modal
            visible={showEditNameModal}
            onRequestClose={onClose}
            animationType="fade"
            transparent={true}
        >
            <View className="flex-1 justify-center items-center">
                <Pressable
                    onPress={onClose}
                    className="absolute top-0 bottom-0 left-0 right-0 bg-black opacity-70"
                />
                <View
                    className="w-11/12 max-w-md bg-brand-black rounded-3xl p-8 shadow-2xl border-2 border-brand-greenDark"
                >
                    {/* Modal Header */}
                    <View className="mb-6">
                        <Text className="text-white text-2xl font-bold text-center">
                            Edit Name
                        </Text>
                        <View className="h-1 w-16 bg-brand-greenLight rounded-full mx-auto mt-3" />
                    </View>

                    {/* First Name Input */}
                    <View className="mb-4">
                        <Text className="text-white text-sm font-semibold mb-2 ml-1">
                            First Name
                        </Text>
                        <TextInput
                            onChangeText={setNewFirstName}
                            value={newFirstName}
                            placeholder="Enter first name"
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            className="bg-brand-greenDark border-2 border-brand-green text-white px-4 py-4 w-full rounded-xl"
                        />
                    </View>

                    {/* Last Name Input */}
                    <View className="mb-6">
                        <Text className="text-white text-sm font-semibold mb-2 ml-1">
                            Last Name
                        </Text>
                        <TextInput
                            onChangeText={setNewLastName}
                            value={newLastName}
                            placeholder="Enter last name"
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            className="bg-brand-greenDark border-2 border-brand-green text-white px-4 py-4 w-full rounded-xl"
                        />
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 bg-brand-greenDark border-2 border-brand-green rounded-xl px-4 py-4"
                            onPress={onClose}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                Cancel
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 bg-brand-greenLight rounded-xl px-4 py-4 shadow-lg"
                            onPress={handleSave}
                        >
                            <Text className="text-white text-center font-bold text-base">
                                Save
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default EditNameModal;