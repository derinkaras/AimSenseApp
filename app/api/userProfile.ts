import {supabase} from "@/app/lib/supabase";

const API_BASE_URL = "http://10.0.0.78:8080/api/v1";

type userProfileData = {
    firstName?: string;
    lastName?: string;
    profilePhotoUri?: string;
}

type updateUserProfileData = {
    firstName?: string;
    lastName?: string;
    profilePhotoUri?: string;
}

const getAuthHeaders = async () => {
    const {data: {session}} = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        ...(
            session?.access_token &&
            {'Authorization': `Bearer ${session.access_token}`}
        )
    }
}

export const userProfileApi = {
    createProfile: async (data: userProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/userProfile/create`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
            }
        );

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create user profile');
        }

        return responseData;
    },

    getMyProfile: async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/userProfile/me`,
            {
                method: 'GET',
                headers,
            }
        );

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            console.log("Gets here")
            throw new Error(data.message || 'Failed to get user profile');
        }

        return data;
    },

    updateProfile: async (req: updateUserProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/userProfile/me`,
            {
                method: 'PUT',
                headers,
                body: JSON.stringify(req),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update profile');
        }

        return data;
    },

    deleteProfile: async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/userProfile/me`,
            {
                method: 'DELETE',
                headers,
            }
        );
        // BE CAREFUL WITH NO CONTENT RETURNS THEY CANNOT BE .json() like above .json() should strickly be done
        // if there is an error in these cases
        if (!response.ok) {
            // DELETE might not have a body, so catch parsing errors
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete profile');
        }

    },
    deleteAccount: async () =>{
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/userProfile/deleteAccount`, {
            method: 'DELETE',
            headers,
        })
        // BE CAREFUL WITH NO CONTENT RETURNS THEY CANNOT BE .json() like above .json() should strickly be done
        // if there is an error in these cases
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete account');
        }
    }
}