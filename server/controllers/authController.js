export const register = async (req, res) => {
  return res.status(410).json({
    message: "Authentication has moved to Clerk. Use the Clerk-powered sign-up flow in the client."
  });
};

export const login = async (req, res) => {
  return res.status(410).json({
    message: "Authentication has moved to Clerk. Use the Clerk-powered login flow in the client."
  });
};
