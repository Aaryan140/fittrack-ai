/* eslint-disable react-hooks/exhaustive-deps */
// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);
const STAY_KEY = "fittrack_stay_logged_in";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (supaUser) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supaUser.id)
        .single();

      if (data) { setProfile(data); return; }

      if (error?.code === "PGRST116" || !data) {
        const name = supaUser.user_metadata?.display_name
          || supaUser.user_metadata?.full_name
          || supaUser.email?.split("@")[0]
          || "User";
        const { data: newProfile } = await supabase
          .from("profiles")
          .upsert({
            id: supaUser.id, email: supaUser.email,
            display_name: name, photo_url: supaUser.user_metadata?.avatar_url || "",
            setup_done: false, created_at: new Date().toISOString(),
          }, { onConflict: "id" })
          .select().single();
        if (newProfile) setProfile(newProfile);
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);
        if (event === "SIGNED_OUT") {
          setUser(null); setProfile(null); setLoading(false); return;
        }
        if (event === "INITIAL_SESSION") {
          if (session?.user) { setUser(session.user); await fetchProfile(session.user); }
          else setLoading(false);
          return;
        }
        if (event === "SIGNED_IN") {
          if (session?.user) { setUser(session.user); await fetchProfile(session.user); }
          return;
        }
        if (session?.user) setUser(session.user);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google", options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    return data;
  };

  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    localStorage.removeItem(STAY_KEY);
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
    window.location.href = "/";
  };

  const saveProfile = async (data) => {
    if (!user) return;
    const row = {
      id:             user.id,
      setup_done:     data.setupDone     !== undefined ? data.setupDone     : profile?.setup_done,
      display_name:   data.displayName   !== undefined ? data.displayName   : profile?.display_name,
      goal:           data.goal          !== undefined ? data.goal          : profile?.goal,
      activity_level: data.activityLevel !== undefined ? data.activityLevel : profile?.activity_level,
      age:            data.age           !== undefined ? data.age           : profile?.age,
      weight:         data.weight        !== undefined ? data.weight        : profile?.weight,
      height:         data.height        !== undefined ? data.height        : profile?.height,
      sex:            data.sex           !== undefined ? data.sex           : profile?.sex,
      step_goal:      data.stepGoal      !== undefined ? data.stepGoal      : profile?.step_goal,
      updated_at:     new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
    if (error) throw error;
    setProfile(p => ({ ...p, ...row }));
  };

  const normalisedProfile = profile ? {
    ...profile,
    setupDone:     profile.setup_done,
    displayName:   profile.display_name || user?.email?.split("@")[0] || "User",
    activityLevel: profile.activity_level,
    stepGoal:      profile.step_goal,
    photoURL:      profile.photo_url,
  } : null;

  return (
    <AuthContext.Provider value={{
      user, profile: normalisedProfile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail, logout, saveProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);