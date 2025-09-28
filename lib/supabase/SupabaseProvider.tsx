"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";

type SupabaseContext = {
  supabase: SupabaseClient | null;
  isLoaded: boolean;
};

const Context = createContext<SupabaseContext>({
  supabase: null,
  isLoaded: false,
});
const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSession();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  // TODO when no `session`, app stuck with text "Loading ..." without redirect to signin screen
  useEffect(() => {
    if (!session) return;

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPERBASE_URL!,
      process.env.NEXT_PUBLIC_SUPERBASE_ANON_KEY!,
      {
        accessToken: async () => session?.getToken() ?? null,
      }
    );

    setSupabase(client);
    setIsLoaded(true);
  }, [session]);

  return (
    <Context.Provider value={{ supabase, isLoaded }}>
      {!isLoaded ? <div>Loading ...</div> : children}
    </Context.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined)
    throw new Error("useSupabase needs to be inside the provider");

  return context;
};

export default SupabaseProvider;
