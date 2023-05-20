import Koa from 'koa';
import Router from 'koa-router';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = new Koa();
const router = new Router();

app.use(async (ctx, next) => {
  // Handle the webhook request here
  console.log('Received webhook request');
  console.log('url: ' + ctx.url);
  console.log('headers : ' + JSON.stringify(ctx.headers));
  console.log('body: ' + ctx.body);
  ctx.status = 200;
  ctx.body = 'Webhook received successfully';
});

// Define the webhook route handler
// router.post('/webhook', (ctx) => {
//   const { username, password, fritzboxEndpoint } = process.env;

//   // Handle the webhook request here
//   console.log('Received webhook request');
//   console.log('url: ' + ctx.url);
//   console.log('headers : ' + JSON.stringify(ctx.headers));
//   console.log('body: ' + ctx.body);

//   ctx.status = 200;
//   ctx.body = 'Webhook received successfully';
// });

// // Register the router middleware
// app.use(router.routes());
// app.use(router.allowedMethods());

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Webhook service listening on port ${port}`);
});
