import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie, deleteCookie } from "@tanstack/react-start/server";

/** Server-side Supabase client bound to the current request's cookies. Only call from server functions / loaders. */
export function createSupabaseServerClient() {
  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            if (!value) {
              deleteCookie(name, options);
            } else {
              setCookie(name, value, options);
            }
          }
        },
      },
    },
  );
}
