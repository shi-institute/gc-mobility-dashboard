SUFFIX=$RANDOM

# create volumes for the container to use
docker volume create --name data-pipeline-input_$SUFFIX > /dev/null
docker volume create --name data-pipeline-output_$SUFFIX > /dev/null
docker volume create --name data-pipeline-credentials_$SUFFIX > /dev/null

# create a temporary container that we can use to copy files into our volumes
docker run -d \
  --name temp_copier_$SUFFIX \
  --volume data-pipeline-input_$SUFFIX:/input \
  --volume data-pipeline-output_$SUFFIX:/output \
  --volume data-pipeline-credentials_$SUFFIX:/credentials \
  ubuntu \
  sleep infinity

# copy the credentials into the volume via the temporary container
if [ -n $BIGQUERY_CREDENTIALS ]; then
  echo $BIGQUERY_CREDENTIALS > ./bigquery_credentials.json
  sudo chmod +r ./bigquery_credentials.json
  docker cp ./bigquery_credentials.json temp_copier_$SUFFIX:/credentials/bigquery_credentials.json
fi

# copy contents of the input directory into the volume via the temporary container
if [ -d $INPUT_DIR ]; then
  docker cp $INPUT_DIR/. temp_copier_$SUFFIX:/input
  sudo chmod -R +r $INPUT_DIR
fi

# run the data pipeline and get whether it was successful
SHOULD_USE_BIGQUERY_STORAGE_API=$([ -n "$ACT" ] && echo "true" || echo "false")
docker run --rm \
  --volume data-pipeline-input_$SUFFIX:/input \
  --volume data-pipeline-output_$SUFFIX:/data \
  --volume data-pipeline-credentials_$SUFFIX:/credentials \
  -e REPLICA_YEARS_FILTER=2023 \
  -e REPLICA_QUARTERS_FILTER=Q4 \
  -e USE_BIGQUERY_STORAGE_API=$SHOULD_USE_BIGQUERY_STORAGE_API \
  gc-mobility-dashboard-data-pipeline:test --etls=$ETLS
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "Data pipeline failed with a non-zero status code: $EXIT_CODE"
  exit $EXIT_CODE
else
  echo "Data pipeline completed successfully."
fi

# if ARTIFACT_NAME is set, copy the output to a temporary directory
# with the same name so it can be uploaded as an artifact in the next step
if [ -n $ARTIFACT_NAME ]; then
  mkdir -p /tmp/artifacts
  docker cp temp_copier_$SUFFIX:/output/. /tmp/artifacts/$ARTIFACT_NAME
fi

# stop and remove the temporary container
docker stop temp_copier_$SUFFIX > /dev/null
docker rm temp_copier_$SUFFIX > /dev/null
