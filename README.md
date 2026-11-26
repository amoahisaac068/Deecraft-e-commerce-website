# Deecraft E-commerce Website

A luxury-bag storefront with Paystack hosted checkout for Ghanaian cedi payments by card or Mobile Money.

## Deploy to Netlify

Import this repository in Netlify. Use the repository configuration: Node 24, no build command, and `public` as the publish directory. Netlify deploys the payment API and applies the order migration on deploy.

## Paystack checkout

- The published production site uses a live `PAYSTACK_SECRET_KEY` from an activated Paystack merchant account. Test checkouts on a Deploy Preview require a Paystack test key in that context. Scope keys to Functions and redeploy after any change. A live key never enables preview payments.
- In the Paystack dashboard, use the production storefront’s `/api/payments/webhook` URL for live payment notifications. This keeps Netlify order records current even when customers close the Paystack page without returning. If the webhook is not configured, returned payments are still verified through Paystack and successful charges remain visible in the Paystack dashboard, including their order reference and items.
- Checkout charges only the product total. Use the customer email on the order to arrange fulfillment. Inventory and shipping are managed separately; catalog limits cap the quantity per checkout but do not reserve or decrement stock across orders.
