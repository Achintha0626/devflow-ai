const { registerUser, loginUser } = require("./auth.service");

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

    const user = await loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: user,
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

module.exports = {
  register,
  login,
};
