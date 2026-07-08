import { getDb } from "../db/client.js";

function mapProfile(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    onboardingCompleted: Boolean(row.onboarding_completed),
    primaryGoals: JSON.parse(row.primary_goals_json),
    currentStage: row.current_stage,
    experienceLevel: row.experience_level,
    targetRoles: JSON.parse(row.target_roles_json),
    skills: JSON.parse(row.skills_json),
    networkingIntent: row.networking_intent,
    preferredCompanyStage: row.preferred_company_stage,
    bio: row.bio,
    resumeText: row.resume_text,
    cityHint: row.city_hint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findProfileByUserId(userId) {
  return mapProfile(getDb().prepare(`SELECT * FROM user_profiles WHERE user_id = ?`).get(userId));
}

export function upsertProfile(profile) {
  getDb()
    .prepare(`
      INSERT INTO user_profiles (
        user_id, onboarding_completed, primary_goals_json, current_stage, experience_level,
        target_roles_json, skills_json, networking_intent, preferred_company_stage, bio,
        resume_text, city_hint, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        onboarding_completed = excluded.onboarding_completed,
        primary_goals_json = excluded.primary_goals_json,
        current_stage = excluded.current_stage,
        experience_level = excluded.experience_level,
        target_roles_json = excluded.target_roles_json,
        skills_json = excluded.skills_json,
        networking_intent = excluded.networking_intent,
        preferred_company_stage = excluded.preferred_company_stage,
        bio = excluded.bio,
        resume_text = excluded.resume_text,
        city_hint = excluded.city_hint,
        updated_at = excluded.updated_at
    `)
    .run(
      profile.userId,
      profile.onboardingCompleted ? 1 : 0,
      JSON.stringify(profile.primaryGoals),
      profile.currentStage,
      profile.experienceLevel,
      JSON.stringify(profile.targetRoles),
      JSON.stringify(profile.skills),
      profile.networkingIntent,
      profile.preferredCompanyStage,
      profile.bio,
      profile.resumeText,
      profile.cityHint,
      profile.createdAt,
      profile.updatedAt,
    );
  return findProfileByUserId(profile.userId);
}
