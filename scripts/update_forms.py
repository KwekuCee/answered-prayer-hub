import codecs

# 1. Update PrayerPointsSection
try:
    with codecs.open("src/components/PrayerPointsSection.tsx", "r", "utf-8") as f:
        prayer_content = f.read()

    prayer_queries = """
  const { data: activeProgram } = useQuery({
    queryKey: ["active-program"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id").eq("is_active", true).maybeSingle();
      if (error && error.code !== "PGRST116") console.error(error);
      return data;
    },
  });
"""
    if "useQuery" not in prayer_content:
        prayer_content = prayer_content.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useQuery } from "@tanstack/react-query";')

    if "active-program" not in prayer_content:
        prayer_content = prayer_content.replace('const [loading, setLoading] = useState(false);', 'const [loading, setLoading] = useState(false);\n' + prayer_queries)
        prayer_content = prayer_content.replace('request: form.prayer_request.trim(),', 'request: form.prayer_request.trim(),\n        program_id: activeProgram?.id || null,')

    with codecs.open("src/components/PrayerPointsSection.tsx", "w", "utf-8") as f:
        f.write(prayer_content)
    print("PrayerPointsSection.tsx updated")
except Exception as e:
    print(f"Failed PrayerPointsSection.tsx: {e}")

# 2. Update RegistrationForm.tsx
try:
    with codecs.open("src/components/RegistrationForm.tsx", "r", "utf-8") as f:
        reg_content = f.read()

    active_program_query = """
  const { data: activeProgram } = useQuery({
    queryKey: ["active-program"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id").eq("is_active", true).maybeSingle();
      if (error && error.code !== "PGRST116") console.error(error);
      return data;
    },
  });
"""
    if "active-program" not in reg_content:
        reg_content = reg_content.replace('const [loading, setLoading] = useState(false);', 'const [loading, setLoading] = useState(false);\n' + active_program_query)
        reg_content = reg_content.replace('church_id: inviter.church_id,', 'church_id: inviter.church_id,\n          program_id: activeProgram?.id || null,')

    with codecs.open("src/components/RegistrationForm.tsx", "w", "utf-8") as f:
        f.write(reg_content)
    print("RegistrationForm.tsx updated")
except Exception as e:
    print(f"Failed RegistrationForm.tsx: {e}")

# 3. Update InviterSignUpForm.tsx
try:
    with codecs.open("src/components/InviterSignUpForm.tsx", "r", "utf-8") as f:
        inviter_content = f.read()

    if "useQuery" not in inviter_content:
        inviter_content = inviter_content.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useQuery } from "@tanstack/react-query";')

    if "active-program" not in inviter_content:
        inviter_content = inviter_content.replace('const [loading, setLoading] = useState(false);', 'const [loading, setLoading] = useState(false);\n' + active_program_query)
        
        # safely insert program_id into the supabase insert object
        # we will look for .from("inviters").insert({ or similar
        inviter_content = inviter_content.replace('.from("inviters")\\n        .insert({', '.from("inviters")\\n        .insert({\\n          program_id: activeProgram?.id || null,')
        inviter_content = inviter_content.replace('.from("inviters")\n        .insert({', '.from("inviters")\n        .insert({\n          program_id: activeProgram?.id || null,')
        inviter_content = inviter_content.replace('.from("inviters").insert({', '.from("inviters").insert({\n          program_id: activeProgram?.id || null,')

    with codecs.open("src/components/InviterSignUpForm.tsx", "w", "utf-8") as f:
        f.write(inviter_content)
    print("InviterSignUpForm.tsx updated")
except Exception as e:
    print(f"Failed InviterSignUpForm.tsx: {e}")
