import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export interface ExtendedUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<ExtendedUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user by email
          const { data: user, error: userError } = await supabaseAdmin
            .from("organization_users")
            .select("*")
            .eq("email", credentials.email)
            .single();

          if (userError || !user) {
            console.log("User not found:", userError?.message);
            return null;
          }

          // Verify password
          if (!user.password_hash || !await bcrypt.compare(credentials.password, user.password_hash)) {
            console.log("Password verification failed");
            return null;
          }

          // Get the organization where this user is the owner
          const { data: organization, error: orgError } = await supabaseAdmin
            .from("organizations")
            .select("*")
            .eq("owner_id", user.id)
            .single();

          if (orgError || !organization) {
            console.log("Organization not found for user:", orgError?.message);
            // Still allow login even without organization, but log it
          }

          console.log("Authentication successful:", {
            userId: user.id,
            email: user.email,
            organizationId: organization?.id,
            organizationName: organization?.name
          });

          // Return user data
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: organization?.id,
            organizationName: organization?.name,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.role = extendedUser.role;
        token.organizationId = extendedUser.organizationId;
        token.organizationName = extendedUser.organizationName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};
