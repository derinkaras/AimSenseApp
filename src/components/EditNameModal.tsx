import React, { useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import UniversalModal from "@/components/UniversalModal";

type editNameModalProps = {
    showEditNameModal: boolean;
    onClose: () => void;
    firstName: string;
    lastName: string;
    /** Saves the name; the parent closes the modal once it succeeds */
    handleSave: (firstName: string, lastName: string) => Promise<void> | void;
};

const INPUT_CLASS = "h-12 rounded-xl bg-brand-greenDark/60 border border-brand-green/60 px-4 text-white";
// No platform padding, so the text sits centered in the field (same as the delete dialog)
const INPUT_STYLE = { fontSize: 16, paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" } as const;

const EditNameModal = ({ showEditNameModal, onClose, firstName, lastName, handleSave }: editNameModalProps) => {
    const [newFirstName, setNewFirstName] = useState(firstName);
    const [newLastName, setNewLastName] = useState(lastName);
    const [saving, setSaving] = useState(false);
    const lastNameRef = useRef<TextInput>(null);

    // Start from the saved name every time the modal opens (reset during render, not in an effect)
    const [wasOpen, setWasOpen] = useState(showEditNameModal);
    if (showEditNameModal !== wasOpen) {
        setWasOpen(showEditNameModal);
        if (showEditNameModal) {
            setNewFirstName(firstName);
            setNewLastName(lastName);
            setSaving(false);
        }
    }

    const first = newFirstName.trim();
    const last = newLastName.trim();
    const unchanged = first === firstName.trim() && last === lastName.trim();
    const hasName = !!(firstName.trim() || lastName.trim());

    const save = async () => {
        if (unchanged || saving) return;
        setSaving(true);
        try {
            await handleSave(first, last);
        } finally {
            setSaving(false);
        }
    };

    const close = () => {
        if (!saving) onClose();
    };

    return (
        <UniversalModal visible={showEditNameModal} onClose={close} avoidKeyboard>
            <Text className="text-white text-lg font-semibold text-center">{hasName ? "Edit your name" : "Add your name"}</Text>
            <Text className="text-white/55 text-sm text-center mt-1.5">Shown on your profile. Only you can see it.</Text>

            <View className="gap-4 mt-5">
                <View>
                    <Text className="text-white/70 text-xs font-semibold mb-2">First name</Text>
                    <TextInput
                        value={newFirstName}
                        onChangeText={setNewFirstName}
                        placeholder="First name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoFocus
                        autoCapitalize="words"
                        autoComplete="given-name"
                        textContentType="givenName"
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                        submitBehavior="submit"
                        maxLength={100}
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                    />
                </View>
                <View>
                    <Text className="text-white/70 text-xs font-semibold mb-2">Last name</Text>
                    <TextInput
                        ref={lastNameRef}
                        value={newLastName}
                        onChangeText={setNewLastName}
                        placeholder="Last name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="words"
                        autoComplete="family-name"
                        textContentType="familyName"
                        returnKeyType="done"
                        onSubmitEditing={save}
                        maxLength={100}
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                    />
                </View>
            </View>

            {/* Actions: the quiet choice on the left, the action on the right (same as Log out) */}
            <View className="flex-row gap-2.5 mt-6">
                <TouchableOpacity
                    onPress={close}
                    disabled={saving}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 items-center justify-center"
                >
                    <Text className="text-white/85 font-semibold text-base">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={save}
                    disabled={unchanged || saving}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: unchanged || saving }}
                    className={`flex-1 h-12 rounded-2xl bg-brand-green border border-brand-greenLight/50 items-center justify-center ${
                        unchanged ? "opacity-40" : ""
                    }`}
                >
                    {saving ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white font-semibold text-base">Save</Text>}
                </TouchableOpacity>
            </View>
        </UniversalModal>
    );
};

export default EditNameModal;
