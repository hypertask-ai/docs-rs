export const feedbackAuthBuild = {
  pure: {
    packages: [
      "better-auth",
      "@better-auth/*",
      "@hypertask-docs/auth",
      "@hypertask-docs/database",
      "vite",
    ],
  },
};

export const feedbackGatewayBuild = {
  pure: { packages: ["@hypertask-docs/database"] },
};
