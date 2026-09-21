const { registerUser, loginUser, refreshUserTokens, getAuthenticatedUser, revokeRefreshToken } = require("./auth.service");

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const user = await registerUser({
      firstName,
      lastName,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (error.message === "USER_INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const refresh = async (req, res) => {
  try { return res.status(200).json({ success: true, data: await refreshUserTokens(req.body.refreshToken) }); }
  catch (error) { if (error.message !== "INVALID_REFRESH_TOKEN") console.error(error); return res.status(401).json({ success: false, message: "Invalid refresh token" }); }
};

const me = async (req, res) => res.status(200).json({ success: true, data: req.user });

const logout = async (req, res) => {
  try { await revokeRefreshToken(req.body.refreshToken); }
  catch (error) { console.error(error); }
  return res.status(200).json({ success: true, message: "Logout successful" });
};

module.exports = {
  register,
  login,
  refresh,
  me,
  logout,
};
