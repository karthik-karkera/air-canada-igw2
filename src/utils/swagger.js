/*
Swagger Documentation
*/
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config()
var os = require("os");
var hostname = os.hostname();
const constants = require('./constants');

module.exports = function(app){
	const options = {
		swaggerDefinition: {
			openapi: '3.0.0',
			basePath: constants.CONTEXT_API,
			info: {
				title: constants.ASE_API_GATEWAY,
				version: constants.SWAGGER_VERSION,
				description: constants.ASE_API_GATEWAY
			},
			servers: [
				{
				  url: "https://"+hostname+":"+process.env.SECURE_PORT+constants.CONTEXT_URL
				}
			  ]
		},
		apis: ["./src/igw/routes/*.js"]
	};

	const swaggerSpec = swaggerJsdoc(options);
	app.use(constants.SWAGGER_CONTEXT_URL, swaggerUi.serve, swaggerUi.setup(swaggerSpec, false, {docExpansion:"none"}));
}
