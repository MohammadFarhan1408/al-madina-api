import { config } from '../config';
import {
  SCENT_FAMILIES,
  PRODUCT_BADGES,
  ORDER_STATUSES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  NOTIFICATION_KINDS,
  USER_TIERS,
  COLLECTION_ACCENTS,
  SORT_OPTIONS,
} from '../constants/business';

/** Standard success/error envelope helpers for the spec. */
const dataEnvelope = (ref: string) => ({
  type: 'object',
  properties: { data: { $ref: ref }, message: { type: 'string' } },
});
const arrayEnvelope = (ref: string) => ({
  type: 'object',
  properties: { data: { type: 'array', items: { $ref: ref } }, message: { type: 'string' } },
});
const paginatedEnvelope = (ref: string) => ({
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: ref } },
        page: { type: 'integer' },
        pageSize: { type: 'integer' },
        total: { type: 'integer' },
        hasMore: { type: 'boolean' },
      },
    },
  },
});

const okJson = (schema: object) => ({ content: { 'application/json': { schema } } });

/** Reusable parameter definitions. */
const pageParam = { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } };
const limitParam = { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 50 } };
const idParam = { in: 'path', name: 'id', required: true, schema: { type: 'string' } };

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Al Madina API',
    version: '1.0.0',
    description:
      'REST API for the Al Madina luxury Arabian perfume (Ittar) eCommerce platform. ' +
      'All responses use a `{ data, message? }` envelope; errors use `{ status, message, code, details? }`.',
  },
  servers: [
    { url: `http://localhost:${config.port}/v1`, description: 'Local' },
    { url: 'https://api.almadina.com/v1', description: 'Production' },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Products' },
    { name: 'Categories' },
    { name: 'Collections' },
    { name: 'Wishlist' },
    { name: 'Orders' },
    { name: 'Notifications' },
    { name: 'Users' },
    { name: 'Search' },
    { name: 'Contact' },
    { name: 'Cart' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: { type: 'integer' },
          message: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          avatar: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['user', 'manager', 'admin'] },
          tier: { type: 'string', enum: [...USER_TIERS] },
          isEmailVerified: { type: 'boolean' },
          isActive: { type: 'boolean' },
          memberSince: { type: 'string', format: 'date-time' },
        },
      },
      AuthResult: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          nameAr: { type: 'string', nullable: true },
          brand: { type: 'string' },
          categoryId: { type: 'string' },
          description: { type: 'string' },
          notes: { type: 'array', items: { type: 'string' } },
          scentFamily: { type: 'string', enum: [...SCENT_FAMILIES] },
          volumeMl: { type: 'integer' },
          price: { type: 'number' },
          originalPrice: { type: 'number', nullable: true },
          currency: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          rating: { type: 'number' },
          reviewCount: { type: 'integer' },
          inStock: { type: 'boolean' },
          badge: { type: 'string', enum: [...PRODUCT_BADGES], nullable: true },
          isFeatured: { type: 'boolean' },
          isNewArrival: { type: 'boolean' },
          isBestSeller: { type: 'boolean' },
          isSignature: { type: 'boolean' },
          isSeasonal: { type: 'boolean' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          tagline: { type: 'string', nullable: true },
          image: { type: 'string' },
          productCount: { type: 'integer' },
          sortOrder: { type: 'integer' },
        },
      },
      Collection: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          image: { type: 'string' },
          accent: { type: 'string', enum: [...COLLECTION_ACCENTS] },
          productIds: { type: 'array', items: { type: 'string' } },
          productCount: { type: 'integer' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          author: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string' },
          body: { type: 'string' },
          verified: { type: 'boolean' },
          date: { type: 'string', format: 'date-time' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          reference: { type: 'string' },
          status: { type: 'string', enum: [...ORDER_STATUSES] },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          deliveryMethod: { type: 'string', enum: [...DELIVERY_METHODS] },
          paymentMethod: { type: 'string', enum: [...PAYMENT_METHODS] },
          subtotal: { type: 'number' },
          shipping: { type: 'number' },
          total: { type: 'number' },
          currency: { type: 'string' },
          placedAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          productName: { type: 'string' },
          productImage: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'integer' },
          volumeMl: { type: 'integer' },
        },
      },
      ShippingAddress: {
        type: 'object',
        required: ['fullName', 'phone', 'address', 'city'],
        properties: {
          fullName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: [...NOTIFICATION_KINDS] },
          title: { type: 'string' },
          body: { type: 'string' },
          read: { type: 'boolean' },
          date: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Unauthorized: { description: 'Authentication required', ...okJson({ $ref: '#/components/schemas/Error' }) },
      Forbidden: { description: 'Insufficient permissions', ...okJson({ $ref: '#/components/schemas/Error' }) },
      NotFound: { description: 'Resource not found', ...okJson({ $ref: '#/components/schemas/Error' }) },
      ValidationError: { description: 'Validation failed', ...okJson({ $ref: '#/components/schemas/Error' }) },
    },
  },
  paths: {
    // ─── Auth ──────────────────────────────────────────────────────────────────
    '/auth/sign-up': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password'],
                properties: {
                  fullName: { type: 'string', minLength: 2, example: 'Faizal Khan' },
                  email: { type: 'string', format: 'email', example: 'faizal@example.com' },
                  password: { type: 'string', minLength: 6, example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', ...okJson(dataEnvelope('#/components/schemas/AuthResult')) },
          409: { description: 'Email already registered', ...okJson({ $ref: '#/components/schemas/Error' }) },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/sign-in': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate with email + password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK', ...okJson(dataEnvelope('#/components/schemas/AuthResult')) },
          401: { description: 'Invalid credentials', ...okJson({ $ref: '#/components/schemas/Error' }) },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate a refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'New token pair' }, 401: { description: 'Invalid/expired/revoked' } },
      },
    },
    '/auth/sign-out': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'Signed out' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', ...okJson(dataEnvelope('#/components/schemas/User')) },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: { 200: { description: 'Reset email sent if account exists' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Complete a password reset',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 6 } } } } },
        },
        responses: { 200: { description: 'Password updated' }, 400: { description: 'Invalid/expired token' } },
      },
    },

    // ─── Products ──────────────────────────────────────────────────────────────
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (filter, sort, paginate) or fetch by ids',
        parameters: [
          pageParam,
          limitParam,
          { in: 'query', name: 'categoryId', schema: { type: 'string' } },
          { in: 'query', name: 'family', schema: { type: 'string', enum: [...SCENT_FAMILIES] } },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: [...SORT_OPTIONS] } },
          { in: 'query', name: 'badge', schema: { type: 'string', enum: [...PRODUCT_BADGES] } },
          { in: 'query', name: 'inStock', schema: { type: 'boolean' } },
          { in: 'query', name: 'minPrice', schema: { type: 'number' } },
          { in: 'query', name: 'maxPrice', schema: { type: 'number' } },
          { in: 'query', name: 'ids', description: 'Comma-separated ids for bulk fetch', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated products (or array when ids set)', ...okJson(paginatedEnvelope('#/components/schemas/Product')) } },
      },
    },
    '/products/search': {
      get: {
        tags: ['Products'],
        summary: 'Full-text product search',
        parameters: [{ in: 'query', name: 'q', required: true, schema: { type: 'string' } }, pageParam, limitParam],
        responses: { 200: { description: 'Paginated results', ...okJson(paginatedEnvelope('#/components/schemas/Product')) } },
      },
    },
    '/products/suggest': {
      get: {
        tags: ['Products'],
        summary: 'Autocomplete product-name suggestions',
        parameters: [{ in: 'query', name: 'q', required: true, schema: { type: 'string' } }, { in: 'query', name: 'limit', schema: { type: 'integer', default: 5 } }],
        responses: { 200: { description: 'Array of names' } },
      },
    },
    '/products/featured': { get: { tags: ['Products'], summary: 'Featured rail', responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Product')) } } } },
    '/products/new-arrivals': { get: { tags: ['Products'], summary: 'New arrivals rail', responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Product')) } } } },
    '/products/best-sellers': { get: { tags: ['Products'], summary: 'Best sellers rail', responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Product')) } } } },
    '/products/signature': { get: { tags: ['Products'], summary: 'Signature rail', responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Product')) } } } },
    '/products/seasonal': { get: { tags: ['Products'], summary: 'Seasonal rail', responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Product')) } } } },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Product details',
        parameters: [idParam],
        responses: { 200: { description: 'OK', ...okJson(dataEnvelope('#/components/schemas/Product')) }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/products/{id}/reviews': {
      get: {
        tags: ['Products'],
        summary: 'Product reviews (paginated)',
        parameters: [idParam, pageParam, limitParam],
        responses: { 200: { description: 'OK', ...okJson(paginatedEnvelope('#/components/schemas/Review')) } },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a review',
        security: [{ bearerAuth: [] }],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['rating', 'title', 'body'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, title: { type: 'string' }, body: { type: 'string' } } } } },
        },
        responses: { 201: { description: 'Created', ...okJson(dataEnvelope('#/components/schemas/Review')) }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ─── Categories & Collections ────────────────────────────────────────────────
    '/categories': { get: { tags: ['Categories'], summary: 'List categories', responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Category')) } } } },
    '/categories/{id}/products': { get: { tags: ['Categories'], summary: 'Products in a category', parameters: [idParam, pageParam, limitParam], responses: { 200: { description: 'OK', ...okJson(paginatedEnvelope('#/components/schemas/Product')) }, 404: { $ref: '#/components/responses/NotFound' } } } },
    '/collections': { get: { tags: ['Collections'], summary: 'List collections', responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Collection')) } } } },
    '/collections/{id}/products': { get: { tags: ['Collections'], summary: 'Products in a collection', parameters: [idParam], responses: { 200: { description: 'OK', ...okJson(arrayEnvelope('#/components/schemas/Product')) }, 404: { $ref: '#/components/responses/NotFound' } } } },

    // ─── Wishlist ────────────────────────────────────────────────────────────────
    '/wishlist': {
      get: { tags: ['Wishlist'], summary: 'Get wishlist product ids', security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' }, 401: { $ref: '#/components/responses/Unauthorized' } } },
      post: {
        tags: ['Wishlist'],
        summary: 'Add to wishlist',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['productId'], properties: { productId: { type: 'string' } } } } } },
        responses: { 201: { description: 'Added' }, 409: { description: 'Already in wishlist' } },
      },
    },
    '/wishlist/{productId}': {
      delete: { tags: ['Wishlist'], summary: 'Remove from wishlist', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'productId', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Removed' }, 404: { $ref: '#/components/responses/NotFound' } } },
    },

    // ─── Orders ──────────────────────────────────────────────────────────────────
    '/orders': {
      get: { tags: ['Orders'], summary: 'Order history', security: [{ bearerAuth: [] }], parameters: [pageParam, limitParam, { in: 'query', name: 'status', schema: { type: 'string', enum: [...ORDER_STATUSES] } }], responses: { 200: { description: 'OK', ...okJson(paginatedEnvelope('#/components/schemas/Order')) }, 401: { $ref: '#/components/responses/Unauthorized' } } },
      post: {
        tags: ['Orders'],
        summary: 'Place an order (auth optional — guest via guestEmail)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items', 'shippingAddress', 'deliveryMethod', 'paymentMethod'],
                properties: {
                  items: { type: 'array', items: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'integer' }, volumeMl: { type: 'integer' } } } },
                  shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
                  deliveryMethod: { type: 'string', enum: [...DELIVERY_METHODS] },
                  paymentMethod: { type: 'string', enum: [...PAYMENT_METHODS] },
                  guestEmail: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created', ...okJson(dataEnvelope('#/components/schemas/Order')) }, 409: { description: 'Out of stock' }, 422: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/orders/{id}': { get: { tags: ['Orders'], summary: 'Order by id (owner or guest via ?email=)', parameters: [idParam, { in: 'query', name: 'email', schema: { type: 'string' } }], responses: { 200: { description: 'OK', ...okJson(dataEnvelope('#/components/schemas/Order')) }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } } } },

    // ─── Notifications ───────────────────────────────────────────────────────────
    '/notifications': { get: { tags: ['Notifications'], summary: 'List notifications', security: [{ bearerAuth: [] }], parameters: [pageParam, limitParam], responses: { 200: { description: 'OK', ...okJson(paginatedEnvelope('#/components/schemas/Notification')) } } } },
    '/notifications/{id}/read': { patch: { tags: ['Notifications'], summary: 'Mark one read', security: [{ bearerAuth: [] }], parameters: [idParam], responses: { 200: { description: 'OK' }, 404: { $ref: '#/components/responses/NotFound' } } } },
    '/notifications/read-all': { patch: { tags: ['Notifications'], summary: 'Mark all read', security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' } } } },

    // ─── Users ───────────────────────────────────────────────────────────────────
    '/users/me': { patch: { tags: ['Users'], summary: 'Update profile', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { fullName: { type: 'string' }, avatar: { type: 'string' } } } } } }, responses: { 200: { description: 'OK', ...okJson(dataEnvelope('#/components/schemas/User')) } } } },
    '/users/me/preferences': { patch: { tags: ['Users'], summary: 'Update preferences', security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/users/me/push-token': { post: { tags: ['Users'], summary: 'Register a push token', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'platform'], properties: { token: { type: 'string' }, platform: { type: 'string', enum: ['ios', 'android'] } } } } } }, responses: { 201: { description: 'Registered' } } } },

    // ─── Search / Contact / Cart ─────────────────────────────────────────────────
    '/search/trending': { get: { tags: ['Search'], summary: 'Trending search terms', responses: { 200: { description: 'OK' } } } },
    '/contact': { post: { tags: ['Contact'], summary: 'Submit the contact form', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'message'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, message: { type: 'string', minLength: 10 } } } } } }, responses: { 200: { description: 'Message received' } } } },
    '/cart/sync': { post: { tags: ['Cart'], summary: 'Reconcile a client cart', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Reconciled cart with server-trusted totals' } } } },

    // ─── Admin (representative) ──────────────────────────────────────────────────
    '/admin/dashboard': { get: { tags: ['Admin'], summary: 'Dashboard metrics', security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' }, 403: { $ref: '#/components/responses/Forbidden' } } } },
    '/admin/products': { post: { tags: ['Admin'], summary: 'Create product', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/Forbidden' } } } },
    '/admin/products/{id}': {
      patch: { tags: ['Admin'], summary: 'Update product', security: [{ bearerAuth: [] }], parameters: [idParam], responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Admin'], summary: 'Soft-delete product', security: [{ bearerAuth: [] }], parameters: [idParam], responses: { 200: { description: 'Deleted' } } },
    },
    '/admin/orders': { get: { tags: ['Admin'], summary: 'List all orders', security: [{ bearerAuth: [] }], parameters: [pageParam, limitParam, { in: 'query', name: 'status', schema: { type: 'string', enum: [...ORDER_STATUSES] } }], responses: { 200: { description: 'OK' } } } },
    '/admin/orders/{id}/status': { patch: { tags: ['Admin'], summary: 'Update order status', security: [{ bearerAuth: [] }], parameters: [idParam], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: [...ORDER_STATUSES] } } } } } }, responses: { 200: { description: 'OK' } } } },
    '/admin/upload': { post: { tags: ['Admin'], summary: 'Upload an image to Cloudinary', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'type', schema: { type: 'string', enum: ['product', 'avatar', 'category', 'collection'] } }], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { 201: { description: 'Returns { url, publicId }' } } } },
    '/admin/notifications': { post: { tags: ['Admin'], summary: 'Broadcast a notification', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } } },
  },
} as const;
