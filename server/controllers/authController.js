import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

  res.json(user);
};

export const login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return res.status(400).json("User not found");

  const isMatch = await bcrypt.compare(req.body.password, user.password);

  if (!isMatch) return res.status(400).json("Invalid credentials");

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ token });
};