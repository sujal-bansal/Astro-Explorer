import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userScehma = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [50, "Username must not exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    profile: {
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
      },
      bio: {
        type: String,
        maxlength: [500, "Bio must not exceed 500 characters"],
      },
    },

    preferences: {
      favoriteAstronomyTopics: [
        {
          type: String,
          enum: ["apod", "mars-rovers", "neo", "earth-imagery", "epic"],
        },
      ],
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },

    apiUsage: {
      totalRequests: {
        type: Number,
        default: 0,
      },
      lastRequestAt: {
        type: Date,
      },
      monthlyRequests: {
        type: Number,
        default: 0,
      },
      resetDate: {
        type: Date,
        default: () =>
          new Date(new Date().getFullYear(), new Date().getMonth() + 1),
      },
    },

    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 604800,
        },
      },
    ],

    lastLogin: {
      type: Date,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userScehma.index({ email: 1 });
userScehma.index({ username: 1 });
userScehma.index({ "tokens.token": 1 });

userScehma.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  const payload = {
    userId: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

userSchema.methods.generateRefreshToken = function () {
  const payload = {
    userId: this._id,
    type: "refresh",
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
};

userSchema.methods.saveToken = async function (token) {
  this.tokens = this.tokens.concat({ token });
  await this.save();
  return token;
};

userSchema.methods.removeToken = async function (token) {
  this.tokens = this.tokens.filter((t) => t.token !== token);
  await this.save();
};

userSchema.methods.removeAllTokens = async function () {
  this.tokens = [];
  await this.save();
};

userSchema.methods.incLoginAttempts = async function () {
  const maxAttemps = 5;
  const lockTime = 2 * 60 * 60 * 1000;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

userSchema.methods.incrementApiUsage = async function () {
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (now >= this.apiUsage.resetDate) {
    this.apiUsage.monthlyRequests = 0;
    this.apiUsage.resetDate = resetDate;
  }

  this.apiUsage.totalRequests += 1;
  this.apiUsage.monthlyRequests += 1;
  this.apiUsage.lastRequestAt = now;

  await this.save();
};

userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid login credentials");
  }

  if (user.isLocked) {
    throw new Error(
      "Account is temporarily locked due to too many failed login attempts"
    );
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    await user.incLoginAttempts();
    throw new Error("Invalid login credentials");
  }

  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  user.lastLogin = new Date();
  await user.save();

  return user;
};

userSchema.statics.cleanExpiredTokens = async function () {
  const expiredDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  await this.updateMany(
    {},
    {
      $pull: {
        tokens: { createdAt: { $lt: expiredDate } },
      },
    }
  );
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;
  delete user.tokens;
  delete user.loginAttempts;
  delete user.lockUntil;

  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
