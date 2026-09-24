import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: async () => {
        const store = await cookies();
        return {
          getAll() {
            return store.getAll();
          },
          setAll(
            cookiesList: { name: string; value: string; options?: CookieOptions }[],
          ) {
            try {
              cookiesList.forEach(({ name, value, options }) =>
                store.set(name, value, options),
              );
            } catch {
              // called from a Server Component — middleware refreshes instead
            }
          },
        };
      },
    },
  );
}

/** Build a data-access client that uses the user-scoped JWT (RLS enforced). */
export async function userClient() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}