# Cost Forecast Page

The `/forecast` page on hypertask.app shows a projected cost forecast for your GitHub repositories, using current usage data from GitHub.

## Using the cost forecast

Navigate to https://hypertask.ai/forecast to see your projected GitHub costs. The forecast is calculated from live data and updated regularly.

## Behind the scenes

The cost forecast relies on a fine-grained personal access token with read-only permissions. Hypertask handles the token inside the application; it exposes no write access and no expiration date.

Setup details:

- Token name: `hypertask-forecast-billing`
- Permissions: read-only
- Scopes: no repository write, no expiration

The Worker environment secret `GITHUB_BILLING_TOKEN` stores the token and provides current repository usage statistics for the forecast.
