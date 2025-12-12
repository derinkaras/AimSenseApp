import {supabase} from "@/app/lib/supabase";


const API_BASE_URL = 'http://10.0.0.78:8080/api/v1';

type GunProfileData = {
    name: string;                     // required
    caliber: string;                  // required
    bulletWeightGrains: number;       // BigDecimal → number
    ballisticCoefficient: number;     // BigDecimal → number
    muzzleVelocityFps: number;        // required
    zeroDistance: number;             // required
    scopeHeight: number;              // BigDecimal → number
    unitSystem: "METRIC" | "IMPERIAL"; // matches your UnitSystem enum

    // optional
    gunPhotoUri?: string;
};

type UpdateGunProfileData = {
    name?: string;                     // required
    caliber?: string;                  // required
    bulletWeightGrains?: number;       // BigDecimal → number
    ballisticCoefficient?: number;     // BigDecimal → number
    muzzleVelocityFps?: number;        // required
    zeroDistance?: number;             // required
    scopeHeight?: number;              // BigDecimal → number
    unitSystem?: "METRIC" | "IMPERIAL"; // matches your UnitSystem enum

    // optional
    gunPhotoUri?: string;
};

const getAuthHeaders = async () => {
    const {data: {session}} = await supabase.auth.getSession();
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(session?.access_token && {
            "Authorization": `Bearer ${session.access_token}`
        })
    }
}

export const gunProfileApi = {
    createProfile: async  (data: GunProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/create`, {
            headers,
            method: 'POST',
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            let errorMessage = `Error ${response.statusText}`;
            const err = await response.json();
            throw new Error(err.message || errorMessage);
        }
        return response.json();
    },

    getAllUserGunProfiles: async() => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/me`, {
            headers,
            method: 'GET',
        })
        if (!response.ok) {
            let errorMessage = `Error ${response.statusText}`;
            const err = await response.json();
            throw new Error(err.message || errorMessage);
        }
        return response.json();
    },

    getSpecificGunProfile: async(id: string) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/me/${id}`, {
            headers,
            method: 'GET',
        })
        if (!response.ok) {
            let errorMessage = `Error ${response.statusText}`;
            const err = await response.json();
            throw new Error(err.message || errorMessage);
        }
        return response.json();
    },

    updateSpecificGunProfile: async(id: string, data: UpdateGunProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/me/${id}`, {
            headers,
            method: 'PATCH',
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            let errorMessage = `Error ${response.statusText}`;
            const err = await response.json();
            throw new Error(err.message || errorMessage);
        }
        return response.json();

    },

    deleteSpecificGunProfile: async(id: string) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/me/${id}`, {
            headers,
            method: 'DELETE',
        })
        if (!response.ok) {
            let errorMessage = `Error ${response.statusText}`;
            const err = await response.json();
            throw new Error(err.message || errorMessage);

        }
        return response.json();
    }

}

