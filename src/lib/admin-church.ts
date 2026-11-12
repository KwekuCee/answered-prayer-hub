import { supabase } from "@/integrations/supabase/client";

export async function assignAdminChurch(profileId: string, churchId: string) {
  if (!profileId || !churchId) throw new Error("Select an administrator and a church.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ church_id: churchId })
    .eq("id", profileId)
    .select("id, church_id")
    .single();

  if (error) throw error;
  if (!data || data.id !== profileId || data.church_id !== churchId) {
    throw new Error("The church assignment was not saved. Check your account permissions.");
  }
  return data;
}