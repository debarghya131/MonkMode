import Journal from "../models/Journal.js";

export const createJournalEntry = async (req, res) => {
  try {
    const { content, mood, date } = req.body;

    if (!content || !mood) {
      return res.status(400).json({ message: "Content and mood are required" });
    }

    const entry = await Journal.create({
      userId: req.user.id,
      content,
      mood,
      date
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJournalEntries = async (req, res) => {
  try {
    const entries = await Journal.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteJournalEntry = async (req, res) => {
  try {
    const entry = await Journal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.json({ message: "Journal entry deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
