# Pennyjar

A simple penny jar server used as a micropayments experiment.

Check out the demo at https://swear.tax.

Or read the blog post at: https://blog.quid.works

## Setup and testing

Install the [Cloud Functions Emulator](https://cloud.google.com/functions/docs/emulator) to develop and test pennyauth-server.

```
# Install Cloud Functions NodeJS emulator
$ npm install -g @google-cloud/functions-emulator

# Start datastore emulator
$ gcloud beta emulators datastore start --no-store-on-disk --consistency 1.0

$ export DATASTORE_EMULATOR_HOST=localhost:8081
$ functions start

# Deploy to emulator
$ functions deploy create --trigger-http
$ functions deploy lookup --trigger-http
$ functions deploy donate --trigger-http

# Test in emulator
$ functions call create --data='{"who": "mo"}'
$ functions logs read
```

## Production notes

- GCP Project: sweartax
- Service account `sweartax@appspot.gserviceaccount.com`
- Cloud functions: create, lookup, donate

### Deploying to production

```
$ gcloud auth login mo@quid.works
$ gcloud config set project sweartax
$ gcloud functions deploy create --runtime nodejs8 --trigger-http
$ gcloud functions deploy donate --runtime nodejs8 --trigger-http
$ gcloud functions deploy lookup --runtime nodejs8 --trigger-http

# Update secrets
gcloud functions deploy donate --update-env-vars QUID_API_SECRET=ks-XXX
```

## Debugging

Logs via `console.log` are written to the cloud function logs (and stackdriver in prod.)

```
$ gcloud functions call validateCaptcha --file=params.json
$ curl -X POST "https://us-central1-pennyauth.cloudfunctions.net/validateCaptcha" \
  -H "Content-Type:application/json" \
  --data '@params.json'

$ gcloud functions logs read
```
