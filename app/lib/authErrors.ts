// app/lib/authErrors.ts
// Maps Firebase Auth error codes to messages that are safe to show in the UI.
export const getAuthErrorMessage = (error: any): string => {
    switch (error?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Incorrect email or password.";
        case "auth/email-already-in-use":
            return "An account with this email already exists.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/weak-password":
            return "Password must be at least 6 characters.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a moment and try again.";
        case "auth/network-request-failed":
            return "Network error. Check your connection and try again.";
        case "auth/user-disabled":
            return "This account has been disabled.";
        case "auth/requires-recent-login":
            return "Please log in again to continue.";
        default:
            return error?.message || "Something went wrong. Please try again.";
    }
};
