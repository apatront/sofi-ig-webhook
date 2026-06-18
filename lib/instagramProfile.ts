type InstagramProfile = {
  id?: string;
  username?: string;
  name?: string;
  profile_pic?: string;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
  is_verified_user?: boolean;
};

export async function fetchInstagramUserProfile(
  instagramScopedUserId: string
): Promise<InstagramProfile | null> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Missing INSTAGRAM_ACCESS_TOKEN");
    return null;
  }

  const fields =
    "name,username,profile_pic,is_user_follow_business,is_business_follow_user,is_verified_user";

  const url = new URL(
    `https://graph.instagram.com/v25.0/${instagramScopedUserId}`
  );

  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();

    console.error("Instagram User Profile API error:", {
      status: response.status,
      body: errorText,
      instagramScopedUserId,
    });

    return null;
  }

  const profile = (await response.json()) as InstagramProfile;

  console.log("Fetched Instagram profile:", {
    instagramScopedUserId,
    username: profile.username,
    name: profile.name,
    hasProfilePic: Boolean(profile.profile_pic),
    isUserFollowBusiness: profile.is_user_follow_business,
    isBusinessFollowUser: profile.is_business_follow_user,
    isVerifiedUser: profile.is_verified_user,
  });

  return profile;
}