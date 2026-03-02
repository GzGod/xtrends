import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.AUTH_TWITTER_ID!,
      clientSecret: process.env.AUTH_TWITTER_SECRET!,
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        token.twitterHandle = (profile as { username?: string }).username ?? "";
        token.twitterId = (profile as { id?: string }).id ?? "";
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
