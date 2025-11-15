// middleware/paginate.js
export function paginate(defaultLimit = 25, maxLimit = 200) {
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    let limit = Math.min(
      maxLimit,
      parseInt(req.query.limit || String(defaultLimit), 10)
    );
    req.pagination = { page, limit, skip: (page - 1) * limit };
    next();
  };
}
