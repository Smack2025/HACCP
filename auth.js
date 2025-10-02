import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

function resolveEnv(keys) {
  for (const key of keys) {
    if (typeof window !== "undefined") {
      if (window?.__env?.[key]) return window.__env[key];
      if (window?.env?.[key]) return window.env[key];
      if (window?.ENV?.[key]) return window.ENV[key];
      if (window?.process?.env?.[key]) return window.process.env[key];
      if (window?.[key]) return window[key];
      if (window?.globalThis?.[key]) return window.globalThis[key];
    }
    if (typeof globalThis !== "undefined" && globalThis?.process?.env?.[key]) {
      return globalThis.process.env[key];
    }
  }
  return undefined;
}

const supabaseUrl = resolveEnv([
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
  "VITE_SUPABASE_URL",
]);
const supabaseAnonKey = resolveEnv([
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY",
]);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found in environment. Auth features will be limited.");
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function createEmitter() {
  const listeners = new Map();
  return {
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      const handlers = listeners.get(event);
      handlers.add(callback);
      return () => handlers.delete(callback);
    },
    off(event, callback) {
      const handlers = listeners.get(event);
      handlers?.delete(callback);
    },
    emit(event, payload) {
      const handlers = listeners.get(event);
      if (handlers) {
        for (const handler of [...handlers]) {
          try {
            handler(payload);
          } catch (err) {
            console.error("Error in auth listener", err);
          }
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(`auth:${event}`, { detail: payload }));
      }
    },
  };
}

const events = createEmitter();

async function signUp({ email, password, options = {} }) {
  if (!supabase) throw new Error("Supabase client not initialised");
  return supabase.auth.signUp({ email, password, options });
}

async function signIn({ email, password }) {
  if (!supabase) throw new Error("Supabase client not initialised");
  return supabase.auth.signInWithPassword({ email, password });
}

async function signOut() {
  if (!supabase) throw new Error("Supabase client not initialised");
  return supabase.auth.signOut();
}

async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function syncProfile(localSettings = {}) {
  if (!supabase) return localSettings;
  const session = await getSession();
  const user = session?.user;
  if (!user) return localSettings;

  const settingsCopy = typeof structuredClone === "function"
    ? structuredClone(localSettings)
    : JSON.parse(JSON.stringify(localSettings));

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,business_name,address,default_staff")
    .eq("id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Failed to fetch profile", error);
    return settingsCopy;
  }

  if (!profile) {
    const payload = {
      id: user.id,
      business_name: settingsCopy.name || null,
      address: settingsCopy.address || null,
      default_staff: settingsCopy.staff || null,
    };
    const { error: upsertError } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (upsertError) {
      console.error("Failed to create profile", upsertError);
    }
    return settingsCopy;
  }

  settingsCopy.name = profile.business_name ?? settingsCopy.name;
  settingsCopy.address = profile.address ?? settingsCopy.address;
  settingsCopy.staff = profile.default_staff ?? settingsCopy.staff;

  try {
    const key = window?.APP_KEYS?.settings ?? "safebite_settings_v1";
    localStorage.setItem(key, JSON.stringify(settingsCopy));
  } catch (storageErr) {
    console.warn("Unable to persist merged settings", storageErr);
  }

  return settingsCopy;
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    events.emit("change", { event, session });
  });

  getSession()
    .then((session) => {
      events.emit("change", { event: "init", session });
    })
    .catch((error) => {
      console.error("Failed to retrieve initial session", error);
    });
}

const authApi = {
  client: supabase,
  signUp,
  signIn,
  signOut,
  getSession,
  syncProfile,
  events,
};

if (typeof window !== "undefined") {
  window.auth = authApi;
  window.dispatchEvent(new CustomEvent("supabase-auth-ready", { detail: authApi }));
}

export default authApi;
