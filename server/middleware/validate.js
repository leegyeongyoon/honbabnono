const { ZodError } = require('zod');

/**
 * Zod validation middleware factory.
 *
 * Validates req.body, req.query, and/or req.params against the provided
 * Zod schemas. Returns 400 with structured validation errors on failure.
 *
 * @param {Object} schemas
 * @param {import('zod').ZodSchema} [schemas.body]   - Schema for req.body
 * @param {import('zod').ZodSchema} [schemas.query]  - Schema for req.query
 * @param {import('zod').ZodSchema} [schemas.params] - Schema for req.params
 * @returns {Function} Express middleware
 *
 * @example
 *   const { z } = require('zod');
 *   const validate = require('../middleware/validate');
 *
 *   router.post('/register',
 *     validate({ body: registerSchema }),
 *     controller.register
 *   );
 */
function validate(schemas) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            source,
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          });
        }
      } else {
        // Replace with parsed (and potentially transformed/coerced) data
        req[source] = result.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}

module.exports = validate;
