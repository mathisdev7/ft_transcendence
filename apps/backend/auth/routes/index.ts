import { FastifyInstance } from "fastify";

import { changePasswordRoute } from "./auth/change-password.ts";
import { forgotPasswordRoute } from "./auth/forgot-password.ts";
import { loginInitRoute } from "./auth/login-init.ts";
import { loginVerifyRoute } from "./auth/login-verify.ts";
import { loginRoute } from "./auth/login.ts";
import { logoutRoute } from "./auth/logout.ts";
import { meRoute } from "./auth/me.ts";
import { recentActivityRoute } from "./auth/recent-activity.ts";
import { refreshRoute } from "./auth/refresh.ts";
import { registerRoute } from "./auth/register.ts";
import { resendVerificationRoute } from "./auth/resend-verification.ts";
import { resetPasswordRoute } from "./auth/reset-password.ts";
import { searchUsersRoute } from "./auth/search-users.ts";
import { updateProfileRoute } from "./auth/update-profile.ts";
import { userProfileRoute } from "./auth/user-profile.ts";
import { verifyEmailCodeRoute } from "./auth/verify-email-code.ts";
import { verifyEmailRoute } from "./auth/verify-email.ts";
import { friendsRoutes } from "./friends/friends.ts";
import { presenceWebSocketRoute } from "./websocket/presence.ts";

import { healthRoute } from "./health/health.ts";

export async function registerAllRoutes(fastify: FastifyInstance) {
  await fastify.register(registerRoute);
  await fastify.register(loginRoute);
  await fastify.register(loginInitRoute);
  await fastify.register(loginVerifyRoute);
  await fastify.register(logoutRoute);
  await fastify.register(refreshRoute);
  await fastify.register(meRoute);
  await fastify.register(updateProfileRoute);
  await fastify.register(userProfileRoute);
  await fastify.register(searchUsersRoute);
  await fastify.register(recentActivityRoute);
  await fastify.register(friendsRoutes);
  await fastify.register(presenceWebSocketRoute);
  await fastify.register(verifyEmailRoute);
  await fastify.register(verifyEmailCodeRoute);
  await fastify.register(resendVerificationRoute);
  await fastify.register(forgotPasswordRoute);
  await fastify.register(resetPasswordRoute);
  await fastify.register(changePasswordRoute);
  await fastify.register(healthRoute);
}
