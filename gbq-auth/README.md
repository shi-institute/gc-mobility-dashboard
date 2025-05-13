This app powers the authentication for Google BigQuery in the data pipeline.

There are two different ways to use this app.

## 1. Docker

The docker image version of this app will start a server at localhost:3000. You should expose port 3000 and bind mount the credentials volume.
Create the credentials folder BEFORE you start Docker. Once you navigate to localhost:3000, you will be prompted to sign in with your Google
account. You should use the Google account with access to the Replica BigQuery. Once you sign in, the app will download the credentials
to ./credentials/bigquery_credentials.json. KEEP THESE CREDENTIALS PRIVATE; they give full access to BigQuery datasets.

Remember to bind the credentials folder from this docker image to data-pipeline docker image's credentials volume. If you do not, you will
not have access to the credentials and the data pipeline process will fail.

## 2. Serverless

The app is also deployed to https://gbq-auth.shi.institute. To retrieve credentials, you will need a server endpoint that can receive a POST request
with the credentials to save to bigquery_credentials.json. Authenticate and trigger the POST for the crednetials by visiting
https://gbq-auth.shi.institute?postUrl={{postUrl}}, where {{postURL}} is the the URL of the endpoint that can receive the credentials.

Remember to copy the bigquery_credentials.json to the appropriate directory for the data pipeline (the credentials folder).
