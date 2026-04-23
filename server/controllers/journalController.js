import Journal from "../models/Journal.js";
import mongoose from "mongoose";

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

export const getJournalHeatmap = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { year } = req.query;

    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }

    const match = { userId };
    if (hasYearFilter) {
      const startDate = new Date(Date.UTC(parsedYear, 0, 1));
      const endDate = new Date(Date.UTC(parsedYear + 1, 0, 1));
      match.date = { $gte: startDate, $lt: endDate };
    }

    const [byDay, byYear] = await Promise.all([
      Journal.aggregate([
        { $match: match },
        {
          $project: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date"
              }
            }
          }
        },
        {
          $group: {
            _id: "$day",
            entries: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Journal.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { $year: "$date" }
          }
        },
        { $sort: { _id: -1 } }
      ])
    ]);

    const values = byDay.map((item) => ({
      date: item._id,
      count: 1,
      entries: item.entries
    }));

    const years = byYear.map((item) => item._id).filter((item) => Number.isFinite(item));

    res.json({
      values,
      years,
      totalSubmittedDays: values.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
