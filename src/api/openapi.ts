export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ParserNews API',
      version: '1.0.0',
      description: 'Minimal OpenAPI specification for public and core operational ParserNews endpoints.',
    },
    servers: [
      {
        url: '/api',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
          required: ['error'],
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            authRequired: { type: 'boolean' },
            authProvider: { type: 'string' },
            checks: {
              type: 'object',
              additionalProperties: {
                type: 'string',
                enum: ['ok', 'error'],
              },
            },
          },
          required: ['status', 'timestamp', 'authRequired', 'authProvider', 'checks'],
        },
        Article: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            summary: { type: ['string', 'null'] },
            source: { type: 'string' },
            source_url: { type: ['string', 'null'], format: 'uri' },
            category: { type: ['string', 'null'] },
            published_at: { type: ['string', 'null'], format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'title', 'summary', 'source', 'source_url', 'category', 'published_at', 'created_at'],
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Service health status',
          responses: {
            '200': {
              description: 'Healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
            '503': {
              description: 'Degraded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/auth/config': {
        get: {
          summary: 'Public authentication configuration',
          responses: {
            '200': {
              description: 'Public auth config',
            },
          },
        },
      },
      '/articles': {
        get: {
          summary: 'List articles with filters and pagination',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { in: 'query', name: 'search', schema: { type: 'string' } },
            { in: 'query', name: 'source', schema: { type: 'string' } },
            { in: 'query', name: 'category', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Paginated articles list',
            },
            '403': {
              description: 'Access denied',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        delete: {
          summary: 'Delete all articles',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Articles deleted' },
          },
        },
      },
      '/articles/{id}': {
        patch: {
          summary: 'Update article category',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    category: { type: ['string', 'null'], maxLength: 120 },
                  },
                  required: ['category'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'Article updated' },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Article not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        delete: {
          summary: 'Delete article by id',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Article deleted' },
            '404': {
              description: 'Article not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
  };
}
