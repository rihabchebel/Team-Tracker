// src/utils/roleUtils.ts
import { supabase, getUserProfile as getProfileFromLib } from "../lib/supabase";

export async function getUserProfile(userId: string) {
  return await getProfileFromLib(userId);
}

export async function getUserTeamMemberships(userId: string) {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching team memberships:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error getting team memberships:", err);
    return [];
  }
}

export async function getSupervisorProjects(userId: string) {
  const memberships = await getUserTeamMemberships(userId);
  const supervisorIds = (memberships || [])
    .filter((m: any) => String(m.role).toLowerCase() === "supervisor")
    .map((m: any) => m.project_id);

  if (supervisorIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("id", supervisorIds);

    if (error) {
      console.error("Error fetching supervisor projects:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error getting supervisor projects:", err);
    return [];
  }
}

export async function getDeveloperProjects(userId: string) {
  const memberships = await getUserTeamMemberships(userId);
  const developerIds = (memberships || [])
    .filter((m: any) => String(m.role).toLowerCase() === "developer")
    .map((m: any) => m.project_id);

  if (developerIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("id", developerIds);

    if (error) {
      console.error("Error fetching developer projects:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error getting developer projects:", err);
    return [];
  }
}

export async function isUserAdmin(userId: string) {
  try {
    const profile = await getUserProfile(userId);
    return profile?.role === "admin";
  } catch (err) {
    console.error("Error checking admin status:", err);
    return false;
  }
}

export async function getUserDashboardMode(userId: string) {
  try {
    if (!userId) return "none";

    const admin = await isUserAdmin(userId);
    if (admin) return "admin";

    const [supervisorProjects, developerProjects] = await Promise.all([
      getSupervisorProjects(userId),
      getDeveloperProjects(userId),
    ]);

    const sCount = (supervisorProjects || []).length;
    const dCount = (developerProjects || []).length;

    if (sCount > 0 && dCount === 0) return "supervisor";
    if (dCount > 0 && sCount === 0) return "developer";
    if (sCount > 0 && dCount > 0) return "both";

    return "none";
  } catch (err) {
    console.error("Error determining dashboard mode:", err);
    return "none";
  }
}

export type DashboardMode =
  | "admin"
  | "supervisor"
  | "developer"
  | "both"
  | "none";
