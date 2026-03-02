import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.AUTH_TWITTER_ID!,
      clientSecret: process.env.AUTH_TWITTER_SECRET!,
      token: {
        url: "https://api.twitter.com/2/oauth2/token",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async request({ provider, params, checks }: any) {
          const credentials = Buffer.from(
            `${provider.clientId}:${provider.clientSecret}`
          ).toString("base64");
          const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: params.code,
            redirect_uri: provider.callbackUrl,
          });
          if (checks.code_verifier) body.set("code_verifier", checks.code_verifier);
          const res = await fetch("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${credentials}`,
            },
            body: body.toString(),
          });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const tokens = await res.json();
          return { tokens };
        },
      },
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        const p = profile as { username?: string; id?: string; data?: { username?: string; id?: string } };
        token.twitterHandle = p.username ?? p.data?.username ?? "";
        token.twitterId = p.id ?? p.data?.id ?? "";
      }
      return token;
    },
    session({ session, token }) {
      session.user.twitterHandle = token.twitterHandle as string;
      session.user.twitterId = token.twitterId as string;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      twitterHandle: string;
      twitterId: string;
    };
  }
}
