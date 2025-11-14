// import swaggerJsdoc from 'swagger-jsdoc';

// const options = {
//   definition: {
//     openapi: '3.0.0',
//     info: {
//       title: 'Naelix v9 API',
//       version: 'v9',
//       description: 'Crypto + Gift Card + P2P (MVC)',
//     },
//     servers: [
//       {
//         url: process.env.BASE_URL || 'http://localhost:8080',
//         description: 'Development server',
//       },
//     ],
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//         },
//       },
//     },
//   },
//   apis: ['./src/routes/**/*.js', './src/controllers/**/*.js'],
//   failOnErrors: false,
//   ignoreUnknownFormats: true,
// };

// let swaggerSpec = {};
// try {
//   swaggerSpec = swaggerJsdoc(options);
//   console.log('✅ Swagger Docs generated successfully');
// } catch (error) {
//   console.error('❌ Swagger Docs generation failed:', error.stack);
// }

// export { swaggerSpec };
