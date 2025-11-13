export default (err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.code || 'SERVER_ERROR', message: err.message });
  next();
};
