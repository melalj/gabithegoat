'use strict';

const sgMail = require('@sendgrid/mail');
const axios = require('axios');

const config = require('./config');
const {products} = require('./helpers/inventory');
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(config.stripe.secretKey);

const product = require('./data/product.json');

stripe.setApiVersion(config.stripe.apiVersion);


const shop = { local: 'en' };

// Render Store
router.get('/', (req, res) => {
  res.render("index", { shop, template: { name: 'index' }});
});

router.get('/pages/the-girls', (req, res) => {
  res.render("pages/girls", { shop, template: { name: 'page', suffix: 'girls' }});
});

router.get('/pages/donate', (req, res) => {
  res.render("pages/donate", { shop, template: { name: 'page', suffix: 'donate' }});
});

router.get('/pages/story', (req, res) => {
  res.render("pages/story", { shop, template: { name: 'page', suffix: 'story' }});
});

router.get('/pages/contact', (req, res) => {
  const recaptchaKey = process.env.RECAPTCHA_KEY;
  res.render("pages/contact", {
    shop,
    recaptchaKey, 
    emplate: { name: 'page', suffix: 'contact' },
    page: { title: 'Contact'},
  });
});

async function verifyRecaptcha(response, remoteip) {
  let query = '?';
  query += `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET)}`;
  query += `&response=${encodeURIComponent(response)}`;
  if (process.env.NODE_ENV === 'production') query += `&remoteip=${encodeURIComponent(remoteip)}`;
  return axios.post(`https://www.google.com/recaptcha/api/siteverify${query}`);
}

router.post('/pages/contact', async (req, res) => {
  const { recaptchaResponse, subject, email, name, message } = req.body;
  const ip = req.ipAddress;
  const recaptchaValidity = await verifyRecaptcha(recaptchaResponse, ip);
  
  if (!email || !subject || !recaptchaResponse || !message) {
    return res.send({ success: false, error: 'Missing data' });
  }
  
  if (!recaptchaValidity.data.success) {
    return res.send({ success: false, error: 'Captcha validation failed' });
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: process.env.SENDGRID_TO,
    from: process.env.SENDGRID_FROM,
    replyTo: email,
    subject: `[Gabi the Goat] ${subject}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  };
  const sg = await sgMail.send(msg);
  res.send({ success: true });
});



router.get('/pages/help-gabi', (req, res) => {
  res.render("pages/help-gabi", { shop, template: { name: 'page', suffix: 'help-gabi' }});
});

router.get('/help-gabi', (req, res) => {
  res.redirect(301, '/pages/help-gabi');
});

router.get('/products', (req, res) => {
  res.redirect(301, '/products/gabi-the-goat-squeaky-toy');
});


router.get('/products/gabi-the-goat-squeaky-toy', (req, res) => {
  res.render("product", { product, shop, template: { name: 'product' }});
});

router.get('/products/:sku', (req, res) => {
  res.redirect(301, '/products/gabi-the-goat-squeaky-toy');
});

router.get('/checkout', (req, res) => {
  res.render("checkout", { shop, template: { name: 'checkout' }});
});


/**
 * Stripe integration to accept all types of payments with 3 POST endpoints.
 *
 * 1. POST endpoint to create a PaymentIntent.
 * 2. For payments using Elements, Payment Request, Apple Pay, Google Pay, Microsoft Pay
 * the PaymentIntent is confirmed automatically with Stripe.js on the client-side.
 * 3. POST endpoint to be set as a webhook endpoint on your Stripe account.
 * It confirms the PaymentIntent as soon as a non-card payment source becomes chargeable.
 */

// Calculate total payment amount based on items in basket.
const calculatePaymentAmount = async items => {
  const productList = await products.list();
  // Look up sku for the item so we can get the current price.
  const skus = productList.data.reduce(
    (a, product) => [...a, ...product.skus.data],
    []
  );
  const total = items.reduce((a, item) => {
    const sku = skus.filter(sku => sku.id === item.parent)[0];
    return a + sku.price * item.quantity;
  }, 0);
  return total;
};

// Create the PaymentIntent on the backend.
router.post('/api/payment_intents', async (req, res, next) => {
  let {currency, items} = req.body;
  const amount = await calculatePaymentAmount(items);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: config.paymentMethods,
    });
    return res.status(200).json({paymentIntent});
  } catch (err) {
    return res.status(500).json({error: err.message});
  }
});

// Update PaymentIntent with shipping cost.
router.post('/api/payment_intents/:id/shipping_change', async (req, res, next) => {
  const {items, shippingOption} = req.body;
  let amount = await calculatePaymentAmount(items);
  amount += products.getShippingCost(shippingOption.id);

  try {
    const paymentIntent = await stripe.paymentIntents.update(req.params.id, {
      amount,
    });
    return res.status(200).json({paymentIntent});
  } catch (err) {
    return res.status(500).json({error: err.message});
  }
});

// Webhook handler to process payments for sources asynchronously.
router.post('/api/webhook', async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  if (config.stripe.webhookSecret) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        config.stripe.webhookSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }
  const object = data.object;

  // PaymentIntent Beta, see https://stripe.com/docs/payments/payment-intents
  // Monitor payment_intent.succeeded & payment_intent.payment_failed events.
  if (object.object === 'payment_intent') {
    const paymentIntent = object;
    if (eventType === 'payment_intent.succeeded') {
      console.log(
        `🔔  Webhook received! Payment for PaymentIntent ${
          paymentIntent.id
        } succeeded.`
      );
    } else if (eventType === 'payment_intent.payment_failed') {
      const paymentSourceOrMethod = paymentIntent.last_payment_error
        .payment_method
        ? paymentIntent.last_payment_error.payment_method
        : paymentIntent.last_payment_error.source;
      console.log(
        `🔔  Webhook received! Payment on ${paymentSourceOrMethod.object} ${
          paymentSourceOrMethod.id
        } of type ${paymentSourceOrMethod.type} for PaymentIntent ${
          paymentIntent.id
        } failed.`
      );
      // Note: you can use the existing PaymentIntent to prompt your customer to try again by attaching a newly created source:
      // https://stripe.com/docs/payments/payment-intents/usage#lifecycle
    }
  }

  // Monitor `source.chargeable` events.
  if (
    object.object === 'source' &&
    object.status === 'chargeable' &&
    object.metadata.paymentIntent
  ) {
    const source = object;
    console.log(`🔔  Webhook received! The source ${source.id} is chargeable.`);
    // Find the corresponding PaymentIntent this source is for by looking in its metadata.
    const paymentIntent = await stripe.paymentIntents.retrieve(
      source.metadata.paymentIntent
    );
    // Check whether this PaymentIntent requires a source.
    if (paymentIntent.status != 'requires_payment_method') {
      return res.sendStatus(403);
    }
    // Confirm the PaymentIntent with the chargeable source.
    await stripe.paymentIntents.confirm(paymentIntent.id, {source: source.id});
  }

  // Monitor `source.failed` and `source.canceled` events.
  if (
    object.object === 'source' &&
    ['failed', 'canceled'].includes(object.status) &&
    object.metadata.paymentIntent
  ) {
    const source = object;
    console.log(`🔔  The source ${source.id} failed or timed out.`);
    // Cancel the PaymentIntent.
    await stripe.paymentIntents.cancel(source.metadata.paymentIntent);
  }

  // Return a 200 success code to Stripe.
  res.sendStatus(200);
});

/**
 * Routes exposing the config as well as the ability to retrieve products.
 */

// Expose the Stripe publishable key and other pieces of config via an endpoint.
router.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: config.stripe.publishableKey,
    stripeCountry: config.stripe.country,
    country: config.country,
    currency: config.currency,
    paymentMethods: config.paymentMethods,
    shippingOptions: config.shippingOptions,
  });
});

// Retrieve all products.
router.get('/api/products', async (req, res) => {
  res.json(await products.list());
});

// Retrieve a product by ID.
router.get('/api/products/:id', async (req, res) => {
  res.json(await products.retrieve(req.params.id));
});

// Retrieve the PaymentIntent status.
router.get('/api/payment_intents/:id/status', async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(req.params.id);
  res.json({paymentIntent: {status: paymentIntent.status}});
});

router.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

router.use((err, req, res, next) => {
  res.locals.error = err;
  res.status(err.status);
  res.render("404", { shop, template: { name: 'page', suffix: '404' }});
});

module.exports = router;
