/* eslint-disable react-hooks/exhaustive-deps */
// src/context/AuthContext.js
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // FIX: Guard against concurrent fetchProfile calls (race condition on OAuth).
  // onAuthStateChange fires multiple times (SIGNED_IN + TOKEN_REFRESHED),
  // so without this lock we'd hit Supabase twice simultaneously.
  const fetchingRef = useRef(false);

  const fetchProfile = async (supaUser) => {
    if (fetchingRef.current) return; // already in flight, skip duplicate call
    fetchingRef.current = true;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supaUser.id)
        .single();

      if (data) {
        setProfile(data);
      } else {
        await ensureProfile(supaUser, supaUser.user_metadata?.display_name || supaUser.email?.split("@")[0] || "");
      }
    } catch (err) {
      // FIX: Always resolve loading even on error, so app doesn't hang forever
      console.error("fetchProfile error:", err);
    } finally {
      // FIX: Always set loading false, even if something throws
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const ensureProfile = async (supaUser, displayName) => {
    const name = displayName
      || supaUser.user_metadata?.display_name
      || supaUser.user_metadata?.full_name
      || supaUser.email?.split("@")[0]
      || "User";

    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", supaUser.id)
        .single();

      if (!existing) {
        const { data } = await supabase
          .from("profiles")
          .insert({
            id:           supaUser.id,
            email:        supaUser.email,
            display_name: name,
            photo_url:    supaUser.user_metadata?.avatar_url || "",
            setup_done:   false,
            created_at:   new Date().toISOString(),
          })
          .select()
          .single();
        if (data) setProfile(data);
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", supaUser.id)
          .single();
        if (data) setProfile(data);
      }
    } catch (err) {
      // FIX: Don't let ensureProfile errors swallow the finally in fetchProfile
      console.error("ensureProfile error:", err);
      throw err; // re-throw so fetchProfile's finally still runs
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // FIX: Only react to meaningful auth events, not every token refresh.
    // SIGNED_IN fires on OAuth callback and email login.
    // SIGNED_OUT fires on logout.
    // TOKEN_REFRESHED fires silently in background — we skip it to avoid
    // the race condition that caused the double-fetch / infinite reload.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setLoading(false);
          fetchingRef.current = false;
          return;
        }

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user);
          }
          return;
        }

        // TOKEN_REFRESHED and other events: just update user silently,
        // don't re-fetch profile (this was causing the refresh loop)
        if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    if (data.user) await ensureProfile(data.user, displayName);
  };

  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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
    const { error } = await supabase.from("profiles").upsert(row);
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