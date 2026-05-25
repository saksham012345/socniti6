const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-me";

// Error messages
const ERRORS = {
    MISSING_FIELDS: "All required fields must be provided",
    INVALID_USERNAME: "Username must be at least 3 characters and contain only letters, numbers, and underscores",
    INVALID_EMAIL: "Please provide a valid email address",
    INVALID_PASSWORD: "Password must be at least 6 characters",
    USERNAME_EXISTS: "Username is already taken",
    EMAIL_EXISTS: "Email is already registered",
    USER_NOT_FOUND: "User not found",
    INVALID_CREDENTIALS: "Invalid username or password",
    DATABASE_ERROR: "Database error occurred. Please try again",
    MONGODB_NOT_CONNECTED: "Database connection error. Please contact support",
};

const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
};

const validateUsername = (username) => {
    if (!username || username.length < 3) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        throw new Error(ERRORS.INVALID_EMAIL);
    }
};

const validatePassword = (password) => {
    if (!password || password.length < 6) {
        throw new Error(ERRORS.INVALID_PASSWORD);
    }
};

const resolvers = {
    Query: {
        me: async (_, __, context) => {
            try {
                const authHeader = context.req?.headers?.authorization || "";
                const token = authHeader.replace("Bearer ", "");
                
                if (!token) {
                    throw new Error("Authentication required. Please log in.");
                }
                
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findById(decoded.id || decoded.sub);
                
                if (!user) {
                    throw new Error(ERRORS.USER_NOT_FOUND);
                }
                
                return user;
            } catch (err) {
                if (err.name === "JsonWebTokenError") {
                    throw new Error("Invalid authentication token. Please log in again.");
                }
                if (err.name === "TokenExpiredError") {
                    throw new Error("Your session has expired. Please log in again.");
                }
                throw err;
            }
        },
        
        user: async (_, { id }) => {
            try {
                const user = await User.findById(id);
                if (!user) {
                    throw new Error(ERRORS.USER_NOT_FOUND);
                }
                return user;
            } catch (err) {
                throw new Error(`Failed to fetch user: ${err.message}`);
            }
        },
        
        users: async () => {
            try {
                return await User.find({});
            } catch (err) {
                throw new Error(`Failed to fetch users: ${err.message}`);
            }
        },
    },

    Mutation: {
        signup: async (_, { fullName, username, email, password, role }) => {
            try {
                // Validate inputs
                if (!fullName || !username || !email || !password) {
                    throw new Error(ERRORS.MISSING_FIELDS);
                }
                
                validateUsername(username);
                validateEmail(email);
                validatePassword(password);

                const normalizedEmail = email.toLowerCase().trim();
                const normalizedUsername = username.toLowerCase().trim();

                // Check if username exists
                const existingUsername = await User.findOne({ username: normalizedUsername });
                if (existingUsername) {
                    throw new Error(ERRORS.USERNAME_EXISTS);
                }

                // Check if email exists
                const existingEmail = await User.findOne({ email: normalizedEmail });
                if (existingEmail) {
                    throw new Error(ERRORS.EMAIL_EXISTS);
                }

                // Hash password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const user = await User.create({
                    fullName,
                    username: normalizedUsername,
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: role || "user",
                    verified: true,
                });

                return { token: generateToken(user), user };
            } catch (err) {
                console.error("❌ Signup error:", err.message);
                throw new Error(`Signup failed: ${err.message}`);
            }
        },

        // NEW: Login with username and password
        login: async (_, { username, password }) => {
            try {
                if (!username || !password) {
                    throw new Error("Username and password are required");
                }

                const normalizedUsername = username.toLowerCase().trim();
                const user = await User.findOne({ username: normalizedUsername });
                
                if (!user) {
                    throw new Error(ERRORS.INVALID_CREDENTIALS);
                }

                const isMatch = await bcrypt.compare(password, user.password || "");
                if (!isMatch) {
                    throw new Error(ERRORS.INVALID_CREDENTIALS);
                }

                const token = generateToken(user);
                
                console.log(`✅ User logged in: ${user.username}`);
                
                return { token, user };
            } catch (err) {
                console.error("❌ Login error:", err.message);
                throw new Error(`Login failed: ${err.message}`);
            }
        },

        // LEGACY: Keep old register for backward compatibility
        register: async (_, { fullName, email, password, role }) => {
            try {
                const normalizedEmail = (email || "").toLowerCase().trim();
                
                if (!normalizedEmail) {
                    throw new Error(ERRORS.INVALID_EMAIL);
                }
                if (!password) {
                    throw new Error(ERRORS.INVALID_PASSWORD);
                }

                let user = await User.findOne({ email: normalizedEmail });
                if (user) {
                    throw new Error(ERRORS.EMAIL_EXISTS);
                }

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                user = await User.create({
                    fullName,
                    username: normalizedEmail.split("@")[0],
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: role || "user",
                    verified: true,
                });

                return { token: generateToken(user), user };
            } catch (err) {
                console.error("❌ Register error:", err.message);
                throw new Error(`Registration failed: ${err.message}`);
            }
        },
    },

    User: {
        __resolveReference(user) {
            return User.findById(user.id);
        },
        id(user) {
            return user.id || user._id;
        }
    },
};

module.exports = resolvers;
