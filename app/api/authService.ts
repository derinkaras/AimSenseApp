// app/api/authService.ts
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { getAuthErrorMessage } from "@/app/lib/authErrors";

const authService = {
    /**
     * Email the user a Firebase password-reset link. The user picks a new password on the
     * page the link opens, so the app never handles a reset code.
     *
     * Firebase (with email-enumeration protection on, the default) reports success even when
     * no account exists for the email, so the message is deliberately non-committal.
     */
    sendPasswordReset: async (email: string): Promise<{ success: boolean; message: string }> => {
        try {
            await sendPasswordResetEmail(auth, email.trim());
            return {
                success: true,
                message: "If an account exists for this email, a reset link is on its way.",
            };
        } catch (error: any) {
            return { success: false, message: getAuthErrorMessage(error) };
        }
    },
};

export default authService;
