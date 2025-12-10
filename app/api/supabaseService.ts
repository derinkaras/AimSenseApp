import {supabase} from "@/app/lib/supabase";


const supabaseApi =  {

    sendResetCode: async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false
            }
        });

        if (error) {
            // Check for specific error types
            if (error.message.includes("Signups not allowed") ) {
                return { success: false, message: 'No account found with this email address' };
            }
            return { success: false, message: error.message };
        }

        return { success: true, message: 'Check your email for the reset code!' };
    },

    resetPasswordWithCode: async (email:string, otpCode: string, newPassword:string) => {
        // Verify the OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
            email: email,
            token: otpCode,
            type: 'email'
        });

        if (verifyError) {
            return { success: false, message: 'Invalid or expired code' };
        }

        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError && !updateError.message.includes('New password should be different')) {
            return { success: false, message: updateError.message };
        }

        return { success: true, message: 'Password reset successful!' };
    },

    resendResetCode: async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false
            }
        });

        if (error) {
            console.log(error.message);
            if (error.message.includes('Signups not allowed')) {
                return { success: false, message: 'No account found with this email address' };
            }
            return { success: false, message: error.message };
        }

        return { success: true, message: 'New code sent! Check your email.' };
    }

}



export default supabaseApi;