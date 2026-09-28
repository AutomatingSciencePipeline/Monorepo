/** Map Google's stable subject to the provider account ID used by Auth.js. */
export function googleProfile(profile) {
  if (typeof profile.sub !== "string" || profile.sub.trim().length === 0) {
    throw new Error("Google profile is missing a valid subject");
  }
  return {
    id: profile.sub,
    name: profile.name,
    role: profile.role ?? "user",
    image: profile.picture,
    email: profile.email,
  };
}
