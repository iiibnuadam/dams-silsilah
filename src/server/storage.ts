import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "person-photos";

export const uploadPersonPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await requireUser();
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("File foto tidak ditemukan.");

    const supabase = createSupabaseServerClient();
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);

    const { data: publicUrl } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return { url: publicUrl.publicUrl };
  });
