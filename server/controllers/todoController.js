import Todo from "../models/Todo.js";

export const createTodo = async (req, res) => {
  const todo = await Todo.create({
    userId: req.user.id,
    title: req.body.title
  });

  res.json(todo);
};

export const getTodos = async (req, res) => {
  const todos = await Todo.find({ userId: req.user.id });
  res.json(todos);
};

export const toggleTodo = async (req, res) => {
  const todo = await Todo.findById(req.params.id);

  todo.completed = !todo.completed;
  await todo.save();

  res.json(todo);
};