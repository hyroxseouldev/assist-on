export const PROFILE_GENDER_VALUES = ["male", "female", "other", "prefer_not_to_say"] as const;

export type ProfileGender = (typeof PROFILE_GENDER_VALUES)[number];

export function isProfileGender(value: string): value is ProfileGender {
  return PROFILE_GENDER_VALUES.includes(value as ProfileGender);
}
