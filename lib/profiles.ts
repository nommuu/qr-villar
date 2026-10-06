import { supabase } from "./supabase";

export type Role = "student" | "teacher" | "admin";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.log("GET PROFILE ERROR:", error.message);
    console.log("GET PROFILE CODE:", error.code);
    return null;
  }

  console.log("GET PROFILE DATA:", data);

  if (!data) {
    console.log("GET PROFILE: No profile found for user:", userId);
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; role?: Role },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  return { error: error?.message ?? null };
}

export type AdminProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getAllProfiles(): Promise<AdminProfile[]> {
  const { data, error } = await supabase.rpc("get_all_profiles");

  if (error || !data) {
    console.log("GET ALL PROFILES ERROR:", error?.message);
    return [];
  }

  return data as AdminProfile[];
}

export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_update_user_role", {
    target_user_id: userId,
    new_role: role,
  });

  if (error) {
    console.log("UPDATE USER ROLE ERROR:", error.message);
    return { error: error.message };
  }

  return { error: null };
}
