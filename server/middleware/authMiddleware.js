import { clerkClient, getAuth } from "@clerk/express";
import User from "../models/User.js";

const getPrimaryEmailAddress = (clerkUser) =>
  clerkUser?.primaryEmailAddress?.emailAddress ||
  clerkUser?.emailAddresses?.find?.((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
  clerkUser?.emailAddresses?.[0]?.emailAddress ||
  "";

const getDisplayName = (clerkUser, fallbackEmail) => {
  const fullName = clerkUser?.fullName || [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (fallbackEmail) return fallbackEmail;
  return "MonkMode User";
};

export const protect = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const normalizedEmail = getPrimaryEmailAddress(clerkUser).toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(401).json({ message: "Authenticated Clerk user is missing a primary email address" });
    }

    const displayName = getDisplayName(clerkUser, normalizedEmail);
    let user = await User.findOne({
      $or: [
        { clerkId: auth.userId },
        { email: normalizedEmail }
      ]
    });

    if (!user) {
      user = await User.create({
        clerkId: auth.userId,
        email: normalizedEmail,
        name: displayName,
        password: ""
      });
    } else {
      let changed = false;

      if (user.clerkId !== auth.userId) {
        user.clerkId = auth.userId;
        changed = true;
      }
      if (user.email !== normalizedEmail) {
        user.email = normalizedEmail;
        changed = true;
      }
      if (!user.name || user.name === "MonkMode User") {
        user.name = displayName;
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      clerkId: user.clerkId
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized", error: error.message });
  }
};
