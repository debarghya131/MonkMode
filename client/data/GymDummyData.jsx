/* ── Helpers ───────────────────────────────────────────────── */
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const shiftISO = (baseDate, offset) => {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offset);
  return toISO(next);
};

const shiftWorkoutIso = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

/* ── TodaysWorkout: Diet summary data ─────────────────────── */
export const DEMO_FULL_DIET = {
  Mon: { morning: ["Warm lemon water", "Soaked almonds (10)"], breakfast: ["Oats with banana & honey", "2 boiled eggs"], lunch: ["Brown rice (1 cup)", "Grilled chicken (150g)", "Cucumber salad"], evening: ["Whey protein shake", "Apple"], dinner: ["Grilled salmon (120g)", "Steamed broccoli"] },
  Tue: { morning: ["Green tea"], breakfast: ["Multigrain toast (2)", "Peanut butter (1 tbsp)"], lunch: ["Quinoa bowl", "Grilled paneer (100g)"], evening: ["Greek yogurt with nuts"], dinner: ["Dal (1 bowl)", "Chapati (2)"] },
  Wed: { morning: ["Apple cider vinegar water"], breakfast: ["Protein pancakes (3)", "Mixed berries"], lunch: ["Chicken wrap", "Side salad"], evening: ["Casein protein shake"], dinner: ["Egg white omelette", "Sauteed spinach"] },
  Thu: { morning: ["Warm water + lemon"], breakfast: ["Scrambled eggs (3)", "Whole wheat toast"], lunch: ["Grilled chicken rice bowl"], evening: ["Protein shake"], dinner: ["Stir fry veggies + tofu"] },
  Fri: { morning: ["Coconut water"], breakfast: ["Avocado toast", "2 eggs"], lunch: ["Tuna salad wrap"], evening: ["Trail mix"], dinner: ["Grilled fish + sweet potato"] },
  Sat: { morning: ["Black coffee"], breakfast: ["Pancakes + honey"], lunch: ["Pasta + chicken"], evening: ["Banana + peanut butter"], dinner: ["Rice + dal + sabzi"] },
  Sun: { morning: ["Herbal tea"], breakfast: ["Poha + curd"], lunch: ["Rajma chawal"], evening: ["Sprouts chaat"], dinner: ["Soup + bread"] },
};

export const DEMO_SUPPLEMENTS = {
  Mon: ["Creatine (5g) — 8:00 AM", "Vitamin D3 (2000 IU) — 8:30 AM", "Omega-3 (1000mg) — 1:00 PM", "Magnesium (400mg) — 9:00 PM"],
  Tue: ["Creatine (5g) — 8:00 AM", "Vitamin D3 (2000 IU) — 8:30 AM", "Zinc (25mg) — 9:00 PM"],
  Wed: ["Creatine (5g) — 8:00 AM", "Omega-3 (1000mg) — 1:00 PM"],
  Thu: ["Creatine (5g) — 8:00 AM", "Vitamin D3 (2000 IU) — 8:30 AM", "Magnesium (400mg) — 9:00 PM"],
  Fri: ["Pre-workout (1 scoop) — 4:30 PM", "Whey protein (30g) — 6:30 PM"],
  Sat: ["Creatine (5g) — 8:00 AM", "Omega-3 (1000mg) — 1:00 PM"],
  Sun: ["Vitamin D3 (2000 IU) — 8:30 AM", "Magnesium (400mg) — 9:00 PM"],
};

export const DEMO_PREWORKOUT = {
  Mon: { pre: ["Banana + black coffee — 4:30 PM", "BCAA drink — 4:45 PM"], post: ["Whey protein shake — 6:30 PM", "Rice cakes (3) — 6:35 PM"] },
  Tue: { pre: ["Oats + honey — 6:45 AM", "Espresso — 7:00 AM"], post: ["Protein shake + milk — 9:00 AM"] },
  Wed: { pre: ["Toast + jam — 9:00 AM"], post: ["Chocolate milk (300ml) — 11:00 AM", "Handful of almonds — 11:10 AM"] },
  Thu: { pre: ["Banana — 5:00 PM", "Black coffee — 5:10 PM"], post: ["Whey isolate — 7:00 PM"] },
  Fri: { pre: ["Pre-workout — 4:30 PM"], post: ["Protein shake — 6:30 PM", "Banana — 6:35 PM"] },
  Sat: { pre: ["Coffee + banana — 8:00 AM"], post: ["Protein shake — 10:30 AM"] },
  Sun: { pre: ["Light snack — 9:00 AM"], post: ["Protein smoothie — 11:00 AM"] },
};

export const DEMO_MACROS = {
  Mon: { protein: "180g", carbs: "280g", fats: "65g", fiber: "35g", calories: "2450 kcal", water: "3.5L", sugar: "40g", sodium: "1800mg" },
  Tue: { protein: "175g", carbs: "260g", fats: "60g", fiber: "32g", calories: "2300 kcal", water: "3L", sugar: "35g", sodium: "1700mg" },
  Wed: { protein: "160g", carbs: "200g", fats: "55g", fiber: "30g", calories: "1950 kcal", water: "3L", sugar: "30g", sodium: "1500mg" },
  Thu: { protein: "185g", carbs: "290g", fats: "68g", fiber: "36g", calories: "2500 kcal", water: "3.5L", sugar: "42g", sodium: "1850mg" },
  Fri: { protein: "170g", carbs: "240g", fats: "58g", fiber: "28g", calories: "2200 kcal", water: "3L", sugar: "33g", sodium: "1600mg" },
  Sat: { protein: "165g", carbs: "270g", fats: "62g", fiber: "30g", calories: "2350 kcal", water: "3L", sugar: "38g", sodium: "1750mg" },
  Sun: { protein: "150g", carbs: "230g", fats: "55g", fiber: "28g", calories: "2100 kcal", water: "2.5L", sugar: "30g", sodium: "1550mg" },
};

/* ── DietChart: Full diet plan data ───────────────────────── */
export const DEMO_DIETS = [
  {
    id: "demo-diet-mon", day: "Mon", isActive: true, copiedFromId: null,
    meals: {
      morning:   [{ id: "dm-1", name: "Warm lemon water", time: "06:00" }, { id: "dm-2", name: "Soaked almonds (10)", time: "06:10" }],
      breakfast: [{ id: "dm-3", name: "Oats with banana & honey", time: "08:00" }, { id: "dm-4", name: "2 boiled eggs", time: "08:05" }],
      lunch:     [{ id: "dm-5", name: "Brown rice (1 cup)", time: "13:00" }, { id: "dm-6", name: "Grilled chicken (150g)", time: "13:00" }, { id: "dm-7", name: "Cucumber salad", time: "13:05" }],
      evening:   [{ id: "dm-8", name: "Whey protein shake", time: "17:00" }, { id: "dm-9", name: "Apple", time: "17:05" }],
      dinner:    [{ id: "dm-10", name: "Grilled salmon (120g)", time: "20:00" }, { id: "dm-11", name: "Steamed broccoli", time: "20:00" }, { id: "dm-12", name: "Sweet potato (half)", time: "20:05" }],
    },
  },
  {
    id: "demo-diet-tue", day: "Tue", isActive: true, copiedFromId: null,
    meals: {
      morning:   [{ id: "dt-1", name: "Green tea", time: "06:15" }],
      breakfast: [{ id: "dt-2", name: "Multigrain toast (2)", time: "08:00" }, { id: "dt-3", name: "Peanut butter (1 tbsp)", time: "08:00" }],
      lunch:     [{ id: "dt-4", name: "Quinoa bowl", time: "13:00" }, { id: "dt-5", name: "Grilled paneer (100g)", time: "13:00" }],
      evening:   [{ id: "dt-6", name: "Greek yogurt with nuts", time: "16:30" }],
      dinner:    [{ id: "dt-7", name: "Dal (1 bowl)", time: "20:00" }, { id: "dt-8", name: "Chapati (2)", time: "20:00" }],
    },
  },
  {
    id: "demo-diet-wed", day: "Wed", isActive: true, copiedFromId: null,
    meals: {
      morning:   [{ id: "dw-1", name: "Apple cider vinegar water", time: "06:10" }],
      breakfast: [{ id: "dw-2", name: "Protein pancakes (3)", time: "08:15" }, { id: "dw-3", name: "Mixed berries", time: "08:20" }],
      lunch:     [{ id: "dw-4", name: "Chicken wrap", time: "13:00" }, { id: "dw-5", name: "Side salad", time: "13:05" }],
      evening:   [{ id: "dw-6", name: "Casein protein shake", time: "17:30" }],
      dinner:    [{ id: "dw-7", name: "Egg white omelette (4 eggs)", time: "20:00" }, { id: "dw-8", name: "Sauteed spinach", time: "20:05" }],
    },
  },
  {
    id: "demo-diet-thu", day: "Thu", isActive: true, copiedFromId: null,
    meals: {
      morning:   [{ id: "dth-1", name: "Warm water + lemon", time: "06:00" }],
      breakfast: [{ id: "dth-2", name: "Scrambled eggs (3)", time: "08:00" }, { id: "dth-3", name: "Whole wheat toast", time: "08:05" }],
      lunch:     [{ id: "dth-4", name: "Grilled chicken rice bowl", time: "13:00" }],
      evening:   [{ id: "dth-5", name: "Protein shake", time: "17:00" }],
      dinner:    [{ id: "dth-6", name: "Stir fry veggies + tofu", time: "20:00" }],
    },
  },
  {
    id: "demo-diet-fri", day: "Fri", isActive: false, copiedFromId: null,
    meals: {
      morning:   [{ id: "df-1", name: "Apple cider vinegar water", time: "06:00" }],
      breakfast: [{ id: "df-2", name: "Protein pancakes (3)", time: "08:30" }, { id: "df-3", name: "Mixed berries", time: "08:35" }],
      lunch:     [{ id: "df-4", name: "Chicken wrap", time: "13:00" }, { id: "df-5", name: "Side salad", time: "13:05" }],
      evening:   [{ id: "df-6", name: "Casein protein shake", time: "17:30" }],
      dinner:    [{ id: "df-7", name: "Egg white omelette (4 eggs)", time: "20:00" }, { id: "df-8", name: "Sauteed spinach", time: "20:05" }],
    },
  },
  {
    id: "demo-diet-sat", day: "Sat", isActive: false, copiedFromId: null,
    meals: {
      morning:   [{ id: "ds-1", name: "Black coffee", time: "06:30" }],
      breakfast: [{ id: "ds-2", name: "Pancakes + honey", time: "08:30" }],
      lunch:     [{ id: "ds-3", name: "Pasta + chicken", time: "13:15" }],
      evening:   [{ id: "ds-4", name: "Banana + peanut butter", time: "17:20" }],
      dinner:    [{ id: "ds-5", name: "Rice + dal + sabzi", time: "20:15" }],
    },
  },
  {
    id: "demo-diet-sun", day: "Sun", isActive: false, copiedFromId: null,
    meals: {
      morning:   [{ id: "dsn-1", name: "Herbal tea", time: "07:00" }],
      breakfast: [{ id: "dsn-2", name: "Poha + curd", time: "09:00" }],
      lunch:     [{ id: "dsn-3", name: "Rajma chawal", time: "13:30" }],
      evening:   [{ id: "dsn-4", name: "Sprouts chaat", time: "17:30" }],
      dinner:    [{ id: "dsn-5", name: "Soup + bread", time: "20:30" }],
    },
  },
];

export const DEMO_WORKOUT_NUTRITION = [
  {
    id: "demo-wn-mon", day: "Mon", isActive: true, copiedFromId: null,
    meals: {
      preWorkout:  [{ id: "wn-1", name: "Banana + black coffee", time: "16:30" }, { id: "wn-2", name: "BCAA drink", time: "16:45" }],
      postWorkout: [{ id: "wn-3", name: "Whey protein shake", time: "18:30" }, { id: "wn-4", name: "Rice cakes (3)", time: "18:35" }],
    },
  },
  {
    id: "demo-wn-tue", day: "Tue", isActive: true, copiedFromId: null,
    meals: {
      preWorkout:  [{ id: "wn-t-1", name: "Oats + honey", time: "06:45" }, { id: "wn-t-2", name: "Espresso", time: "07:00" }],
      postWorkout: [{ id: "wn-t-3", name: "Protein shake + milk", time: "09:00" }, { id: "wn-t-4", name: "Banana", time: "09:05" }],
    },
  },
  {
    id: "demo-wn-wed", day: "Wed", isActive: true, copiedFromId: null,
    meals: {
      preWorkout:  [{ id: "wn-5", name: "Oats + honey", time: "06:45" }, { id: "wn-6", name: "Espresso", time: "07:00" }],
      postWorkout: [{ id: "wn-7", name: "Protein shake + milk", time: "09:00" }, { id: "wn-8", name: "Banana", time: "09:05" }],
    },
  },
  {
    id: "demo-wn-thu", day: "Thu", isActive: true, copiedFromId: null,
    meals: {
      preWorkout:  [{ id: "wn-th-1", name: "Banana + black coffee", time: "17:00" }],
      postWorkout: [{ id: "wn-th-2", name: "Whey isolate shake", time: "19:00" }],
    },
  },
  {
    id: "demo-wn-fri", day: "Fri", isActive: false, copiedFromId: null,
    meals: {
      preWorkout:  [{ id: "wn-f-1", name: "Toast + jam", time: "09:00" }],
      postWorkout: [{ id: "wn-f-2", name: "Chocolate milk (300ml)", time: "11:00" }, { id: "wn-f-3", name: "Handful of almonds", time: "11:10" }],
    },
  },
  {
    id: "demo-wn-sat", day: "Sat", isActive: false, copiedFromId: null,
    meals: {
      preWorkout:  [{ id: "wn-9", name: "Toast + jam", time: "09:00" }],
      postWorkout: [{ id: "wn-10", name: "Chocolate milk (300ml)", time: "11:00" }, { id: "wn-11", name: "Handful of almonds", time: "11:10" }],
    },
  },
  {
    id: "demo-wn-sun", day: "Sun", isActive: false, copiedFromId: null,
    meals: {
      preWorkout:  [{ id: "wn-su-1", name: "Light fruit snack", time: "08:30" }],
      postWorkout: [{ id: "wn-su-2", name: "Protein smoothie", time: "10:30" }],
    },
  },
];

export const DEMO_SUPP_PLANS = [
  {
    id: "demo-sp-mon", day: "Mon", isActive: true, copiedFromId: null,
    items: [
      { id: "sp-1", name: "Creatine (5g)",        time: "08:00" },
      { id: "sp-2", name: "Vitamin D3 (2000 IU)", time: "08:30" },
      { id: "sp-3", name: "Omega-3 (1000mg)",     time: "13:00" },
      { id: "sp-4", name: "Magnesium (400mg)",    time: "21:00" },
    ],
  },
  {
    id: "demo-sp-tue", day: "Tue", isActive: true, copiedFromId: null,
    items: [
      { id: "sp-5", name: "Creatine (5g)",        time: "08:00" },
      { id: "sp-6", name: "Vitamin D3 (2000 IU)", time: "08:30" },
      { id: "sp-7", name: "Zinc (25mg)",           time: "21:00" },
    ],
  },
  {
    id: "demo-sp-wed", day: "Wed", isActive: true, copiedFromId: null,
    items: [
      { id: "sp-w-1", name: "Creatine (5g)",    time: "08:00" },
      { id: "sp-w-2", name: "Omega-3 (1000mg)", time: "13:00" },
    ],
  },
  {
    id: "demo-sp-thu", day: "Thu", isActive: true, copiedFromId: null,
    items: [
      { id: "sp-th-1", name: "Creatine (5g)",        time: "08:00" },
      { id: "sp-th-2", name: "Vitamin D3 (2000 IU)", time: "08:30" },
      { id: "sp-th-3", name: "Magnesium (400mg)",    time: "21:00" },
    ],
  },
  {
    id: "demo-sp-fri", day: "Fri", isActive: false, copiedFromId: null,
    items: [
      { id: "sp-8", name: "Pre-workout (1 scoop)", time: "16:30" },
      { id: "sp-9", name: "Whey protein (30g)",    time: "18:30" },
    ],
  },
  {
    id: "demo-sp-sat", day: "Sat", isActive: false, copiedFromId: null,
    items: [
      { id: "sp-sa-1", name: "Creatine (5g)",    time: "08:00" },
      { id: "sp-sa-2", name: "Omega-3 (1000mg)", time: "13:00" },
    ],
  },
  {
    id: "demo-sp-sun", day: "Sun", isActive: false, copiedFromId: null,
    items: [
      { id: "sp-su-1", name: "Vitamin D3 (2000 IU)", time: "08:30" },
      { id: "sp-su-2", name: "Magnesium (400mg)",    time: "21:00" },
    ],
  },
];

export const DEMO_MACRO_PLANS = [
  {
    id: "demo-mp-mon", day: "Mon", isActive: true, copiedFromId: null,
    values: { protein: "180", carbs: "280", fats: "65", fiber: "35", calories: "2450", water: "3.5", sugar: "40", sodium: "1800" },
  },
  {
    id: "demo-mp-tue", day: "Tue", isActive: true, copiedFromId: null,
    values: { protein: "175", carbs: "260", fats: "60", fiber: "32", calories: "2300", water: "3", sugar: "35", sodium: "1700" },
  },
  {
    id: "demo-mp-wed", day: "Wed", isActive: true, copiedFromId: null,
    values: { protein: "175", carbs: "260", fats: "60", fiber: "32", calories: "2300", water: "3", sugar: "35", sodium: "1700" },
  },
  {
    id: "demo-mp-thu", day: "Thu", isActive: true, copiedFromId: null,
    values: { protein: "185", carbs: "290", fats: "68", fiber: "36", calories: "2500", water: "3.5", sugar: "42", sodium: "1850" },
  },
  {
    id: "demo-mp-fri", day: "Fri", isActive: false, copiedFromId: null,
    values: { protein: "160", carbs: "200", fats: "55", fiber: "30", calories: "1950", water: "3", sugar: "30", sodium: "1500" },
  },
  {
    id: "demo-mp-sat", day: "Sat", isActive: false, copiedFromId: null,
    values: { protein: "165", carbs: "270", fats: "62", fiber: "30", calories: "2350", water: "3", sugar: "38", sodium: "1750" },
  },
  {
    id: "demo-mp-sun", day: "Sun", isActive: false, copiedFromId: null,
    values: { protein: "150", carbs: "230", fats: "55", fiber: "28", calories: "2100", water: "2.5", sugar: "30", sodium: "1550" },
  },
];

/* ── AddWorkout: Workout plan demo data ───────────────────── */
export const createDummyWorkouts = (baseDate) => [
  {
    id: "demo-push-strength",
    title: "Push Strength",
    isActive: true,
    goalType: "muscle-gain",
    workoutSplit: "bro-split",
    totalEstimatedTime: "33",
    days: ["Mon"],
    startDate: shiftISO(baseDate, -2),
    neverEnds: true,
    endDate: "",
    difficulty: "Advanced",
    exercises: [
      { id: "demo-ex-1", name: "Bench Press", sets: "5", reps: "5", weight: "85", duration: "6", restTime: "120", bodyPart: "Chest - Mid" },
      { id: "demo-ex-2", name: "Overhead Press", sets: "4", reps: "8", weight: "40", duration: "5", restTime: "90", bodyPart: "Shoulders - Front" },
      { id: "demo-ex-3", name: "Tricep Pushdown", sets: "3", reps: "12", weight: "25", duration: "4", restTime: "60", bodyPart: "Arms - Triceps" },
      { id: "demo-ex-101", name: "Incline Cable Fly", sets: "3", reps: "12", weight: "16", duration: "4", restTime: "60", bodyPart: "Chest - Upper" },
      { id: "demo-ex-102", name: "Weighted Dips", sets: "3", reps: "10", weight: "10", duration: "4", restTime: "75", bodyPart: "Chest - Lower" },
    ],
  },
  {
    id: "demo-push-volume",
    title: "Push Volume",
    isActive: true,
    goalType: "muscle-gain",
    workoutSplit: "ppl",
    totalEstimatedTime: "41",
    days: ["Mon"],
    startDate: shiftISO(baseDate, -4),
    neverEnds: false,
    endDate: shiftISO(baseDate, 28),
    difficulty: "Intermediate",
    exercises: [
      { id: "demo-ex-22", name: "Incline Dumbbell Press", sets: "4", reps: "10-12", weight: "28", duration: "5", restTime: "75", bodyPart: "Chest - Upper" },
      { id: "demo-ex-23", name: "Cable Fly", sets: "3", reps: "12-15", weight: "18", duration: "4", restTime: "60", bodyPart: "Chest - Mid" },
      { id: "demo-ex-24", name: "Lateral Raise", sets: "4", reps: "15", weight: "8", duration: "4", restTime: "45", bodyPart: "Shoulders - Side" },
      { id: "demo-ex-103", name: "Machine Chest Press", sets: "4", reps: "10", weight: "55", duration: "5", restTime: "75", bodyPart: "Chest - Mid" },
      { id: "demo-ex-104", name: "Rope Pushdown", sets: "3", reps: "15", weight: "22", duration: "4", restTime: "60", bodyPart: "Arms - Triceps" },
    ],
  },
  {
    id: "demo-upper-primer",
    title: "Upper Primer",
    isActive: true,
    goalType: "endurance",
    workoutSplit: "upper-lower",
    totalEstimatedTime: "36",
    days: ["Tue"],
    startDate: shiftISO(baseDate, -6),
    neverEnds: true,
    endDate: "",
    difficulty: "Beginner",
    exercises: [
      { id: "demo-ex-25", name: "Push-Up", sets: "4", reps: "15", weight: "0", duration: "4", restTime: "45", bodyPart: "Chest - Mid" },
      { id: "demo-ex-26", name: "Cable Row", sets: "4", reps: "12", weight: "40", duration: "5", restTime: "60", bodyPart: "Back - Mid" },
      { id: "demo-ex-27", name: "Plank", sets: "3", reps: "60 sec", weight: "0", duration: "5", restTime: "45", bodyPart: "Core - Upper" },
      { id: "demo-ex-105", name: "Dumbbell Shoulder Press", sets: "3", reps: "12", weight: "16", duration: "4", restTime: "60", bodyPart: "Shoulders - Front" },
      { id: "demo-ex-106", name: "Lat Pulldown", sets: "3", reps: "12", weight: "50", duration: "5", restTime: "60", bodyPart: "Back - Lats" },
    ],
  },
  {
    id: "demo-arms-blast",
    title: "Arms Blast",
    isActive: true,
    goalType: "muscle-gain",
    workoutSplit: "bro-split",
    totalEstimatedTime: "30",
    days: ["Tue"],
    startDate: shiftISO(baseDate, -3),
    neverEnds: true,
    endDate: "",
    difficulty: "Intermediate",
    exercises: [
      { id: "demo-ex-39", name: "Barbell Curl", sets: "4", reps: "10", weight: "25", duration: "4", restTime: "60", bodyPart: "Arms - Biceps" },
      { id: "demo-ex-40", name: "Skull Crushers", sets: "4", reps: "12", weight: "25", duration: "4", restTime: "60", bodyPart: "Arms - Triceps" },
      { id: "demo-ex-41", name: "Farmer's Walk", sets: "3", reps: "40 m", weight: "30", duration: "5", restTime: "60", bodyPart: "Arms - Forearms" },
      { id: "demo-ex-107", name: "Cable Curl", sets: "3", reps: "12", weight: "18", duration: "4", restTime: "50", bodyPart: "Arms - Biceps" },
      { id: "demo-ex-108", name: "Overhead Cable Extension", sets: "3", reps: "12", weight: "20", duration: "4", restTime: "60", bodyPart: "Arms - Triceps" },
    ],
  },
  {
    id: "demo-pull-builder",
    title: "Pull Builder",
    isActive: true,
    goalType: "strength",
    workoutSplit: "ppl",
    totalEstimatedTime: "42",
    days: ["Wed"],
    startDate: shiftISO(baseDate, -1),
    neverEnds: false,
    endDate: shiftISO(baseDate, 21),
    difficulty: "Intermediate",
    exercises: [
      { id: "demo-ex-4", name: "Pull-Up", sets: "4", reps: "8", weight: "0", duration: "5", restTime: "90", bodyPart: "Back - Lats" },
      { id: "demo-ex-5", name: "Cable Row", sets: "4", reps: "10", weight: "55", duration: "5", restTime: "75", bodyPart: "Back - Mid" },
      { id: "demo-ex-6", name: "Hammer Curl", sets: "3", reps: "12", weight: "15", duration: "4", restTime: "60", bodyPart: "Arms - Forearms" },
      { id: "demo-ex-109", name: "Chest Supported Row", sets: "3", reps: "10", weight: "45", duration: "5", restTime: "75", bodyPart: "Back - Mid" },
      { id: "demo-ex-110", name: "Face Pull", sets: "3", reps: "15", weight: "20", duration: "4", restTime: "45", bodyPart: "Shoulders - Rear" },
    ],
  },
  {
    id: "demo-core-engine",
    title: "Core Engine",
    isActive: true,
    goalType: "endurance",
    workoutSplit: "full-body",
    totalEstimatedTime: "27",
    days: ["Wed"],
    startDate: shiftISO(baseDate, -2),
    neverEnds: true,
    endDate: "",
    difficulty: "Beginner",
    exercises: [
      { id: "demo-ex-42", name: "Hanging Knee Raise", sets: "4", reps: "12", weight: "0", duration: "4", restTime: "45", bodyPart: "Core - Lower" },
      { id: "demo-ex-43", name: "Cable Crunch", sets: "4", reps: "15", weight: "25", duration: "4", restTime: "45", bodyPart: "Core - Upper" },
      { id: "demo-ex-44", name: "Side Plank", sets: "3", reps: "40 sec", weight: "0", duration: "4", restTime: "30", bodyPart: "Core - Obliques" },
      { id: "demo-ex-111", name: "Russian Twist", sets: "3", reps: "20", weight: "8", duration: "4", restTime: "30", bodyPart: "Core - Obliques" },
      { id: "demo-ex-112", name: "Plank Reach", sets: "3", reps: "16", weight: "0", duration: "4", restTime: "30", bodyPart: "Core - Upper" },
    ],
  },
  {
    id: "demo-back-density",
    title: "Back Density",
    isActive: true,
    goalType: "strength",
    workoutSplit: "bro-split",
    totalEstimatedTime: "46",
    days: ["Thu"],
    startDate: shiftISO(baseDate, -5),
    neverEnds: false,
    endDate: shiftISO(baseDate, 24),
    difficulty: "Advanced",
    exercises: [
      { id: "demo-ex-28", name: "T-Bar Row", sets: "5", reps: "8", weight: "55", duration: "6", restTime: "90", bodyPart: "Back - Mid" },
      { id: "demo-ex-29", name: "Deadlift", sets: "4", reps: "5", weight: "120", duration: "7", restTime: "150", bodyPart: "Back - Lower" },
      { id: "demo-ex-30", name: "Pull-Up", sets: "4", reps: "10", weight: "0", duration: "5", restTime: "75", bodyPart: "Back - Lats" },
      { id: "demo-ex-113", name: "Barbell Shrugs", sets: "4", reps: "12", weight: "70", duration: "4", restTime: "60", bodyPart: "Back - Traps" },
      { id: "demo-ex-114", name: "Straight Arm Pulldown", sets: "3", reps: "15", weight: "25", duration: "4", restTime: "45", bodyPart: "Back - Lats" },
    ],
  },
  {
    id: "demo-deload-mobility",
    title: "Deload Mobility",
    isActive: true,
    goalType: "endurance",
    workoutSplit: "full-body",
    totalEstimatedTime: "24",
    days: ["Thu"],
    startDate: shiftISO(baseDate, -8),
    neverEnds: false,
    endDate: shiftISO(baseDate, 14),
    difficulty: "Beginner",
    exercises: [
      { id: "demo-ex-37", name: "Stretch Flow", sets: "3", reps: "10 min", weight: "0", duration: "10", restTime: "30", bodyPart: "Core - Obliques" },
      { id: "demo-ex-38", name: "Bird Dog", sets: "3", reps: "12", weight: "0", duration: "5", restTime: "30", bodyPart: "Lower Back - Erector Spinae" },
      { id: "demo-ex-125", name: "Dead Bug", sets: "3", reps: "16", weight: "0", duration: "4", restTime: "30", bodyPart: "Core - Lower" },
      { id: "demo-ex-126", name: "Cat-Cow Mobility", sets: "3", reps: "60 sec", weight: "0", duration: "4", restTime: "20", bodyPart: "Lower Back - Erector Spinae" },
    ],
  },
  {
    id: "demo-leg-power",
    title: "Leg Power",
    isActive: true,
    goalType: "muscle-gain",
    workoutSplit: "upper-lower",
    totalEstimatedTime: "48",
    days: ["Fri"],
    startDate: shiftISO(baseDate, -3),
    neverEnds: false,
    endDate: shiftISO(baseDate, 14),
    difficulty: "Advanced",
    exercises: [
      { id: "demo-ex-7", name: "Squat", sets: "5", reps: "5", weight: "100", duration: "7", restTime: "150", bodyPart: "Legs - Quads" },
      { id: "demo-ex-8", name: "Romanian Deadlift", sets: "4", reps: "8", weight: "90", duration: "6", restTime: "120", bodyPart: "Legs - Hamstrings" },
      { id: "demo-ex-9", name: "Calf Raise", sets: "4", reps: "15", weight: "40", duration: "4", restTime: "45", bodyPart: "Legs - Calves" },
      { id: "demo-ex-115", name: "Leg Press", sets: "4", reps: "12", weight: "170", duration: "6", restTime: "90", bodyPart: "Legs - Quads" },
      { id: "demo-ex-116", name: "Walking Lunges", sets: "3", reps: "20", weight: "12", duration: "5", restTime: "60", bodyPart: "Legs - Glutes" },
    ],
  },
  {
    id: "demo-leg-hypertrophy",
    title: "Leg Hypertrophy",
    isActive: true,
    goalType: "muscle-gain",
    workoutSplit: "ppl",
    totalEstimatedTime: "52",
    days: ["Fri"],
    startDate: shiftISO(baseDate, -7),
    neverEnds: false,
    endDate: shiftISO(baseDate, 18),
    difficulty: "Intermediate",
    exercises: [
      { id: "demo-ex-31", name: "Leg Press", sets: "4", reps: "12", weight: "160", duration: "6", restTime: "90", bodyPart: "Legs - Quads" },
      { id: "demo-ex-32", name: "Hip Thrust", sets: "4", reps: "10", weight: "90", duration: "5", restTime: "75", bodyPart: "Legs - Glutes" },
      { id: "demo-ex-33", name: "Calf Raise", sets: "5", reps: "20", weight: "35", duration: "4", restTime: "45", bodyPart: "Legs - Calves" },
      { id: "demo-ex-117", name: "Leg Curl", sets: "4", reps: "12", weight: "45", duration: "5", restTime: "60", bodyPart: "Legs - Hamstrings" },
      { id: "demo-ex-118", name: "Step-ups", sets: "3", reps: "12", weight: "14", duration: "4", restTime: "60", bodyPart: "Legs - Quads" },
    ],
  },
  {
    id: "demo-shoulder-sculpt",
    title: "Shoulder Sculpt",
    isActive: true,
    goalType: "fat-loss",
    workoutSplit: "arnold-split",
    totalEstimatedTime: "34",
    days: ["Sat"],
    startDate: shiftISO(baseDate, -3),
    neverEnds: true,
    endDate: "",
    difficulty: "Intermediate",
    exercises: [
      { id: "demo-ex-34", name: "Overhead Press", sets: "4", reps: "8", weight: "42", duration: "5", restTime: "75", bodyPart: "Shoulders - Front" },
      { id: "demo-ex-35", name: "Lateral Raise", sets: "4", reps: "15", weight: "7", duration: "4", restTime: "45", bodyPart: "Shoulders - Side" },
      { id: "demo-ex-36", name: "Face Pull", sets: "4", reps: "15", weight: "22", duration: "4", restTime: "45", bodyPart: "Shoulders - Rear" },
      { id: "demo-ex-119", name: "Arnold Press", sets: "3", reps: "10", weight: "18", duration: "5", restTime: "75", bodyPart: "Shoulders - Front" },
      { id: "demo-ex-120", name: "Upright Row", sets: "3", reps: "12", weight: "30", duration: "4", restTime: "60", bodyPart: "Shoulders - Side" },
    ],
  },
  {
    id: "demo-upper-volume-sat",
    title: "Upper Volume",
    isActive: true,
    goalType: "muscle-gain",
    workoutSplit: "upper-lower",
    totalEstimatedTime: "40",
    days: ["Sat"],
    startDate: shiftISO(baseDate, -4),
    neverEnds: true,
    endDate: "",
    difficulty: "Intermediate",
    exercises: [
      { id: "demo-ex-45", name: "Incline Dumbbell Press", sets: "4", reps: "10", weight: "30", duration: "5", restTime: "75", bodyPart: "Chest - Upper" },
      { id: "demo-ex-46", name: "Lat Pulldown", sets: "4", reps: "12", weight: "60", duration: "5", restTime: "75", bodyPart: "Back - Lats" },
      { id: "demo-ex-47", name: "Lateral Raise", sets: "4", reps: "15", weight: "8", duration: "4", restTime: "45", bodyPart: "Shoulders - Side" },
      { id: "demo-ex-121", name: "Seated Cable Row", sets: "3", reps: "12", weight: "52", duration: "5", restTime: "70", bodyPart: "Back - Mid" },
      { id: "demo-ex-122", name: "Bench Dips", sets: "3", reps: "15", weight: "0", duration: "4", restTime: "45", bodyPart: "Arms - Triceps" },
    ],
  },
];

export const RETIRED_DEMO_WORKOUT_IDS = new Set(["demo-core-reset", "demo-sunday-conditioning"]);

export const createDummyLogs = (baseDate) => [
  { id: "demo-log-1",  action: "created",    title: "Push Strength",  date: shiftISO(baseDate, 0),   time: "06:15" },
  { id: "demo-log-2",  action: "updated",    title: "Leg Power",      date: shiftISO(baseDate, -1),  time: "19:10" },
  { id: "demo-log-3",  action: "copied",     title: "Pull Builder",   note: "to Tue, Thu", date: shiftISO(baseDate, -2),  time: "07:40" },
  { id: "demo-log-4",  action: "created",    title: "Core Reset",     date: shiftISO(baseDate, -4),  time: "18:05" },
  { id: "demo-log-5",  action: "activated",  title: "Push Strength",  note: "for Mon",     date: shiftISO(baseDate, -1),  time: "06:20" },
  { id: "demo-log-6",  action: "created",    title: "Push Volume",    date: shiftISO(baseDate, -5),  time: "05:55" },
  { id: "demo-log-7",  action: "copied",     title: "Upper Primer",   note: "to Thu, Sat", date: shiftISO(baseDate, -3),  time: "08:10" },
  { id: "demo-log-8",  action: "updated",    title: "Back Density",   date: shiftISO(baseDate, -2),  time: "09:25" },
  { id: "demo-log-9",  action: "activated",  title: "Shoulder Sculpt", note: "for Sat",   date: shiftISO(baseDate, -1),  time: "07:05" },
  { id: "demo-log-10", action: "created",    title: "Leg Hypertrophy", date: shiftISO(baseDate, -6), time: "06:50" },
  { id: "demo-log-11", action: "updated",    title: "Deload Mobility", date: shiftISO(baseDate, -10), time: "08:35" },
];

/* ── gym/Progress: Exercise progress demo data ────────────── */
export const createDemoWorkoutProgressMap = () => {
  const dates = [
    shiftWorkoutIso(-56),
    shiftWorkoutIso(-42),
    shiftWorkoutIso(-28),
    shiftWorkoutIso(-14),
    shiftWorkoutIso(-7),
  ];

  const series = [
    { id: "demo-incline-bench",    name: "Incline Bench Press",  bodyPart: "Chest - Upper",       sets: [4,4,4,5,5], reps: [8,8,9,9,10],    weight: [52.5,55,57.5,60,62.5], totalTime: [7,7,8,8,9],  rest: [90,90,85,85,80] },
    { id: "demo-cable-row",        name: "Cable Row",            bodyPart: "Back - Mid",          sets: [3,3,4,4,4], reps: [10,10,10,11,12], weight: [42.5,45,47.5,50,52.5], totalTime: [6,6,7,7,8],  rest: [75,75,75,70,70] },
    { id: "demo-lat-pulldown",     name: "Lat Pulldown",         bodyPart: "Back - Lats",         sets: [3,3,4,4,4], reps: [10,11,11,12,12], weight: [45,47.5,50,52.5,55],   totalTime: [6,6,7,7,8],  rest: [75,75,70,70,65] },
    { id: "demo-overhead-press",   name: "Overhead Press",       bodyPart: "Shoulders - Front",   sets: [3,3,4,4,4], reps: [8,8,8,9,9],      weight: [30,32.5,35,37.5,40],   totalTime: [6,6,7,7,8],  rest: [90,90,85,85,80] },
    { id: "demo-lateral-raise",    name: "Lateral Raise",        bodyPart: "Shoulders - Side",    sets: [3,3,3,4,4], reps: [12,12,13,13,14], weight: [8,8,9,10,10],           totalTime: [5,5,6,6,7],  rest: [60,60,55,55,50] },
    { id: "demo-hammer-curl",      name: "Hammer Curl",          bodyPart: "Arms - Biceps",       sets: [3,3,4,4,4], reps: [10,10,10,11,12], weight: [12,12,14,14,16],        totalTime: [5,5,6,6,7],  rest: [60,60,55,55,50] },
    { id: "demo-skull-crusher",    name: "Skull Crusher",        bodyPart: "Arms - Triceps",      sets: [3,3,3,4,4], reps: [10,10,11,11,12], weight: [20,22.5,25,25,27.5],    totalTime: [5,5,6,6,7],  rest: [70,70,65,65,60] },
    { id: "demo-back-squat",       name: "Back Squat",           bodyPart: "Legs - Quads",        sets: [4,4,4,5,5], reps: [6,6,7,7,8],      weight: [80,82.5,85,90,95],      totalTime: [8,8,9,10,10], rest: [120,120,115,115,110] },
    { id: "demo-romanian-deadlift",name: "Romanian Deadlift",    bodyPart: "Legs - Hamstrings",   sets: [3,3,4,4,4], reps: [8,8,8,9,10],     weight: [70,75,80,82.5,85],      totalTime: [7,7,8,8,9],  rest: [105,105,100,100,95] },
    { id: "demo-plank",            name: "Plank Hold",           bodyPart: "Core - Upper",        sets: [3,3,3,4,4], reps: [1,1,1,1,1],      weight: [0,0,0,5,5],             totalTime: [4,4,5,5,6],  rest: [45,45,40,40,35] },
    { id: "demo-leg-press",        name: "Leg Press",            bodyPart: "Legs - Quads",        sets: [3,3,4,4,5], reps: [10,10,10,11,12], weight: [120,130,140,150,160],   totalTime: [7,7,8,8,9],  rest: [110,110,105,100,95] },
    { id: "demo-face-pull",        name: "Face Pull",            bodyPart: "Back - Rear Delts",   sets: [3,3,3,4,4], reps: [12,12,13,13,14], weight: [18,20,22,24,25],        totalTime: [5,5,6,6,7],  rest: [60,60,55,55,50] },
  ];

  const map = {};
  series.forEach((exercise, exerciseIndex) => {
    dates.forEach((date, idx) => {
      const savedMinutes = String(5 + exerciseIndex).padStart(2, "0");
      map[`${date}_${exercise.id}`] = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        bodyPart: exercise.bodyPart,
        sets: String(exercise.sets[idx]),
        reps: String(exercise.reps[idx]),
        lastSetReps: String(exercise.reps[idx]),
        weight: String(exercise.weight[idx]),
        lastSetWeight: String(exercise.weight[idx]),
        totalTime: String(exercise.totalTime[idx]),
        restBetweenSets: String(exercise.rest[idx]),
        savedAt: `${date}T07:${savedMinutes}:00.000Z`,
      };
    });
  });

  return map;
};
