# Greenville Connects Mobility Dashboard Data Pipeline

The data pipeline downloads and processes the data used by the dashboard.
It exports static files that can be used by the dashboard frontend.

The data pipeline runs on Ubuntu 24 via Docker.

## Prerequisite software

- Docker

## Running the data pipeline with Docker

To run the data pipeline, you must have Docker installed. You can download Docker from https://www.docker.com/get-started. If you are using Windows, you should run Docker inside of Windows Subsystem for Linux 2 (WSL2).

Once Docker is installed, you can run the data pipeline with the following commands:

```bash
# create the input and data folders if they do not already exist
mkdir -p ./input ./data

# ensure the current user owns the input and data folders and their contents
sudo chown -R $(id -u):$(id -g) ./input ./data

# run the Docker container to execute the data pipeline
docker run --rm -it --volume ./input:/input --volume ./data:/data --volume ./gbq-credentials:/credentials --user $(id -u):$(id -g) --env-file .env ghcr.io/shi-institute/gc-mobility-dashboard-data-pipeline:latest
```

- `--rm` automatically removes the container when it exits.
- `-it` runs the container in interactive mode, allowing you to see the output in your terminal.
- `--volume $(pwd)/input:/app/input` mounts a local `input` folder to the container's `/input` folder. If you have any input data files, place them
- `--volume ./data:/data` mounts a local `data` folder to the container's `/data` folder. The data pipeline will write all output data to this folder.
- `--volume .gbq-credentials:/credentials` mounts a local `gbq-credentials` folder to the container's `/credentials` folder. See the `replica` pipeline documentation for more information on how to populate this folder with credentials.
- `--user $(id -u):$(id -g)` runs the container with your user ID and group ID. This ensures that any files created by the container will be owned by your user, rather than the root user. This also means that the container will be able to read and write files in the mounted volumes that are owned by your user.
- `--env-file .env` passes environment variables to the container. See the "how the data pipeline works" section below for more information on which environment variables are required.
- `ghcr.io/shi-institute/gc-mobility-dashboard-data-pipeline:latest` is the name of the Docker image to run. This image is hosted on GitHub Container Registry. When you run this command, Docker will automatically download the image if it is not already present on your system.

If you do not already have a `.env` file, create one in the same directory where you run the `docker run` command. The following sections will describe which environment variables are required. Note that the `.env` file has no file extension; it is simply named `.env`.

## How the data pipeline works

The data pipeline is implemented in Python. For some steps, it downloads data from remote APIs.
For other steps, you must provide data in specific input folders. The subsequent descriptions
in this document will describe (at a high level) how each step works and what inputs you must provide.

The data pipeline exports all data to a commond `data` folder. The location of this folder depends
on how you run the data pipeline.

The data pipeline is broken into eight "runners." Each runner is responsible for downloading
and or processing a specific dataset or fusion of datasets. The eight runners are:

- `census_acs_5year`: Downloads and processes 5-year American Community Survey data from the US Census Bureau.
- `geocoder`: Geocodes addresses using Greenville County's and OpenStreetMap's geocoding services.
- `greenlink_gtfs`: Downloads and processes Greenlink's GTFS feed. Historical GTFS feeds are from transit.land.
- `passthrough`: Copies static files from the `input/passthrough` folder to the `data/passthrough` folder. 
- `greenlink_ridership`: Reads multiple ridership CSV files in the format provided by Greenlink and combines them into a sorted, single file that is usable by the dashboard and the other runners.
- `replica`: Downloads and processes Replica's synthetic population and trip data for selected areas.
- `essential_services`: Creates spatially-enabled datatsets of essential services and calculates their accessibility via public transit.
- `future_routes`: For given future transit routes, it calculates demographics for the areas served by those routes and estimates what percentage of trips in the route's service area could be served by the route.

The following sections describe each step in more detail, including required inputs and generated outputs.

<details>
<summary><h3><code>census_acs_5year</code></h3></summary>

This runner downloads and processes 5-year American Community Survey data from the US Census Bureau.

#### Inputs

This runner may require a Census API key. To obtain a key, visit https://api.census.gov/data/key_signup.html. Do not share this key publicly. Once you have an API key, add `CENSUS_API_KEY=your_key_here` to your `.env` file.

This runner also depends on the contents of `./input/replica_interest_area_polygons`. See the `replica` runner documentation for more information about this folder.

#### Dependencies

*This runner has no depencency on other runners.*

#### Actions

This runner performs the following steps:

1. Download population totals for all census tracts in Greenville County, SC.
2. Download race and ethnicity data for all census tracts in Greenville County, SC.
3. Download educational attainment data for all census tracts in Greenville County, SC.
4. Download household vehicle ownership data for all census tracts in Greenville County, SC.
5. Download census tract geometries for for the union of areas specified in `./input/replica_interest_area_polygons`.
6. Calculate which census tract centroids fall within each area specified in `./input/replica_interest_area_polygons`.
7. Combine all downloaded census data and information about area-tract geospatial relationships into a single file.

#### Outputs

This runner stores all intermediate and final outputs in the `./data/census_acs_5year` folder. The final, combined output is `./data/census_acs_5year/time_series.json`.

</details>
<details>
<summary><h3><code>geocoder</code></h3></summary>

A geocoder is a tool that converts addresses into geographic coordinates (latitude and longitude).

This runner geocodes addresses using Greenville County's and OpenStreetMap's geocoding services. [Greenville County's geocoder](https://www.gcgis.org/arcgis/rest/services/GVL_COMPOSITE_LOC/GeocodeServer/geocodeAddresses) is more accurate and should be used when possible. OpenStreetMap's geocoder ([Nominatim](https://nominatim.openstreetmap.org/search)) is used as a fallback when Greenville County's geocoder does not return a result.

#### Inputs

All inputs should be placed in the `./input/to_geocode` folder. Inputs must be in CSV format. Inputs must not be empty. The input folder should contain one or more CSV files with the following columns:

- `ZIP`, `ZIP Code`, `ZIPCODE`, or `Zip`: The ZIP code of the address to geocode. (e.g., 29613)
- `Address`, `ADDRESS`, or `Street`: The street address to geocode. (e.g. 3300 Poinsett Highway)

Note that county, state, and country are not required. The geocoder assumes that all addresses are in Greenville County, SC, USA. Greenville County's geocoder has better performance when these fields are not provided.

Additional columns may be present in the input files. They will be preserved in the geocoded output.

Input file names should be appended with an ISO 8601 date string. For example, `grocery_stores__2025-01-31.csv`. This allows you to keep multiple versions of the same input file in the input folder. Later runners will attempt to use the temporally closest geocoded results.

The following datasets are recommended inputs:

| Dataset | Description | Source | File name example |
|---------|-------------|--------|-------------------|
| Grocery stores | Locations of grocery stores in Greenville County, SC |  | | `grocery_stores__2025-01-31.csv` |
| Child care providers | Locations of childcare providers in Greenville County, SC | [Greenville County iMap](https://www.gcgis.org/arcgis/rest/services/imap/imap/MapServer) | | `childcare__2025-07-16.csv` |
| Dental providers | Locations of dental providers in Greenville County, SC |  | `dental__2025-01-31.csv` |
| Eye care providers | Locations of eye care providers in Greenville County, SC |  | `eye_care__2025-01-31.csv` |
| Family medicine providers | Locations of family medicine providers in Greenville County, SC |  | `family_medicine__2025-01-31.csv` |
| Free clinics | Locations of free clinics in Greenville County, SC |  | `free_clinics__2025-01-31.csv` |
| Hospitals | Locations of hospitals in Greenville County, SC |  | `hospitals__2025-01-31.csv` |
| Internal medicine | Locations of internal medicine providers in Greenville County, SC |  | `internal_medicine__2025-01-31.csv` |
| Urgent care | Locations of urgent care providers in Greenville County, SC |  | `urgent_care__2025-01-31.csv` |

*The above recommended inputs are used by the `essential_services` runner.*

#### Dependencies

*This runner has no depencency on other runners.*

#### Actions

This runner performs the following steps for each CSV file in the `./input/to_geocode` folder:

1. Read the CRV file.
2. For each row in the CSV file, attempt to geocode the address using Greenville County's geocoder.
3. After attempting to geocode all addresses with Greenville County's geocoder, attempt to geocode any addresses that were not successfully geocoded using OpenStreetMap's geocoder.
4. Save the geocoded results to a GeoJSON file.
5. Save the the failed rows to a CSV file.

#### Outputs

This runner stores all outputs in the `./data/geocoded` folder. For each input CSV file, it generates up to two output files:
- A GeoJSON file containing all successfully geocoded addresses. The file name is the same as the input file, but it is prepended with `geocoded_` and uses a `.geojson` extension. For example, `geocoded_grocery_stores__2025-01-31.geojson`.
- A CSV file containing all addresses that could not be geocoded. The file name is the same as the input file, but it is prepended with `failed_`. For example, `failed_grocery_stores__2025-01-31.csv`. This file is only generated if at least one row was not geocoded.

</details>
<details>
<summary><h3><code>greenlink_gtfs</code></h3></summary>

This runner downloads and processes [Greenlink's GTFS feed](https://gtfs.greenlink.cadavl.com/GTA/GTFS/GTFS_GTA.zip). A [GTFS feed](https://gtfs.org/) is a standardized format for public transportation schedules and associated geographic information. It includes information about route and stop locations.

For the downloaded GTFS feed to actually represent Greenlink's service at a particular point in time, the feed must be downloaded from an archive of historical GTFS feeds. This runner attempts to download historical GTFS feeds from [Transitland](https://www.transit.land/feeds/f-dnjq-greenlink).

This runner also generates walking, biking, and paratransit service areas. For walking and biking, geodesic buffers are created around each transit stop. For paratransit, service areas are created by generating a euclidian buffer around the entire transit route.

By default, the walking service area is 0.5 miles, the biking service area is 3.75 miles (15 minutes at 15 miles per hour), and the paratransit service area is 0.75 miles.

#### Inputs

For accurate results, you must provide a **Transitland API key**. Interline/Transitland offers limited API access for free for academic and hobyist use (non-commercial). To obtain a key, visit https://www.transit.land/plans-pricing/#transitland-feed-archive:~:text=Transitland%20Feed%20Archive and sign up for a plan. Once you have a plan, go to [your profile on the Interline Portal](https://app.interline.io/users/me) to view your API key. Do not share this key with anyone; this is your personal key. Once you have an API key, add `TRANSITLAND_API_KEY=your_key_here` to your `.env` file.

> [!CAUTION]
> This runner does not re-download GTFS feeds that have already been downloaded. If you originally ran this runner without a transitland API key, you MUST delete the contents of `./data/greenlink_gtfs` before re-running this runner with a transitland API key. Failure to do so will result in inaccurate outputs.

Generated service areas can be overridden by providing custom service area GeoJSON files for the *entire transit network* in the `./input/greenlink_gtfs/service_area_overrides` folder.

| Type | File name format | Example |
|------|------------------|---------|
| Walking service area | `walkshed__<year>_<Q2 or Q4>.geojson` | `walkshed__2025_Q2_.geojson` |
| Biking service area | `bikeshed__<year>_<Q2 or Q4>.geojson` | `bikeshed__2023_Q4_.geojson` |

Q2 and Q4 correspond the seasons from Replica. Q2 (Spring) is April 1 - June 30. Q4 (Fall) is October 1 - December 31. We recommend basing your custom service areas for a particular season on the latest available GTFS feed for that season.

> [!CAUTION]
> Failure to include the entire transit network in your custom service area files will result in inaccurate outputs.

> [!IMPORTANT]
> For consistent results, if you want to provide a custom service area file for one season, you should provide custom service area files for all seasons.

#### Dependencies

This runner's output is affected by the `INCLUDE_FULL_AREA_IN_AREAS` environment variable from the `replica` runner. If you change the value of this variable, you should re-run this runner to ensure that service areas are avalable for the full area output from the `replica` runner.

#### Actions

1. Download the GTFS feed for each season and area since Fall 2019 (`2019_Q4`). For feeds that could not be downloaded, register a substitution request.
2. Transform each downloaded GTFS feed into GeoJSON representations of routes and stops.
3. Resolve substitution requests to the next available GTFS feed.
4. Generate and save service areas for walking, biking, and paratransit. If an override file is provided for a particular service area type and season, it will be copied to the output folder instead of generating a new service area.
5. Calculate and save service coverage statistics for each area and season.

#### Outputs

For each season, this runner outputs the routes, stops, and service areas to `./data/greenlink_gtfs/<year>/<Q2 or Q4>`.

Service coverage statistics for each season and area combination are stored as an array of objects in `./data/greenlink_gtfs/service_coverage_stats.json`.

</details>
<details>
<summary><h3><code>passthrough</code></h3></summary>

This runner copies static files from the `input/passthrough` folder to the `data/passthrough` folder.

#### Inputs

All inputs should be placed in the `./input/passthrough` folder. The folder may contain any type of file. The folder may also contain subfolders.

#### Dependencies

*This runner has no depencency on other runners.*

#### Actions

1. Delete all existing contents of the `./data/passthrough` folder.
2. Recursively copy all files and folders from `./input/passthrough` to `./data/passthrough`.

#### Outputs

This runner stores all outputs in the `./data/passthrough` folder. The output folder will contain the same files and folder structure as the input folder.

</details>
<details>
<summary><h3><code>greenlink_ridership</code></h3></summary>

This runner reads multiple ridership CSV files in the format provided by Greenlink and converts them into a wall-formatted JSON file for each season and a single, combined JSON file for all seasons.

#### Inputs

All inputs should be placed in the `./input/greenlink_ridership` folder. Inputs must be in CSV format. Inputs must not be empty. The input folder should contain one or more CSV files with the following columns:

- `Period`: The date corresponding to the row's ridership data. It may be in any format that can be properly parsed by `pandas.to_datetime()` with its default parameters. (e.g., 2023-01-31 or 01/31/2023)
- `Stop Point`: The ID number for the transit stop. (e.g., 1234)
- `Ridership - Boarding - APC`: The number of boardings at the stop during the period. (e.g., 42)
- `Ridership - Alighting - APC`: The number of alightings at the stop during the period. (e.g., 37)

These columns and values correspond the the exact CSV structure provided by Greenlink as of July 2025. Additional columns will be ignored and omitted from the output.

#### Dependencies

This runner depends on the output of the `greenlink_gtfs` runner. It uses the GTFS stop IDs to validate that the stop IDs in the ridership data are valid.

#### Actions

For each input CSV file, this runner performs the following steps:

1. Read the CSV file.
2. Validate that all required columns are present.
3. Rename the columns to standard names. (Period -> period, Stop Point -> stop_point, Ridership - Boarding - APC -> boarding, Ridership - Alighting - APC -> alighting)
4. Omit additional columns.
5. Parse the `period` column as a date. Drop rows with invalid dates.
6. Parse the `stop_point`, `boarding`, and `alighting` columns as integers. Drop rows with non-numeric values in any of these columns.
7. Store the output in-memory.

Then:

8. Save the stored, in-memory output to a single, combined, unsroted output file.
9. Filter the in-memory output by season and save a separate output file for each season.

#### Outputs

The combined, unsorted output is stored in `./data/greenlink_ridership/all_ridership.json`.

Seasonal, unsorted outputs are stored in `./data/greenlink_ridership/<year>/<Q2 or Q4>/ridership.json`.

</details>
<details>
<summary><h3><code>replica</code></h3></summary>

The `replica` runner is responsible for downloading and processing Replica's synthetic population and trip data for a set of specified areas. Processing steps include generating demographic summaries, trip summaries, and transit accessibility statistics. Vector tiles are also generated for visualizing the travel patterns of the synthetic population.

This runner requires an active subscription to [Replica](https://www.replicahq.com/) and read access to Replica's BigQuery datasets. Contact Replica to obtain a subscription. To obtain read access to Replica's BigQuery datasets, refer to their [documentation](https://help.replicahq.com/en/articles/7339439-replica-direct-database-access-request) (you must be logged in to view this page). It may take between 

> [!IMPORTANT]
> This runner will download and generate a large amount of data (tens of gigabytes). Ensure that you have sufficient disk space available before running this runner.


This runner caches most of its steps on the file system. This ensures that subsequent runs with the exact same configuration will skip many steps that have already been completed. This is useful in case of failures due to network issues or quota limits. If you want to re-run a step that has already been completed, you must delete the corresponding cached files.

#### Inputs

Prior to using this runner, you must generate local credentials for accessing Replica's BigQuery datasets. To do this, follow the steps below:

1. Run the following commands in a terminal. Run these commands in the same directory where you will run the data pipeline.

    ```bash
    # create the credentials folder if it does not already exist
    mkdir -p ./gbq-credentials
    
    # ensure the current user owns the credentials folder and its contents
    sudo chown -R $(id -u):$(id -g) ./gbq-credentials

    # run the Docker container to generate credentials
    docker run -it -p 3000:3000 --volume ./gbq-credentials:/credentials --user $(id -u):$(id -g) ghcr.io/shi-institute/gc-mobility-dashboard-gbq-auth:latest
    ```

2. Follow the link printed in the terminal output. This will open a Google sign-in page in your web browser.
3. Sign in with the Google account that has been granted read access to Replica's BigQuery datasets.
4. Accept the permissions request.
5. When you see the "Done. You can close this window now." message, that means the credentials have been generated and saved to the `./gbq-credentials` folder.

> [!NOTE]
> If your credentials are expired or revoked, but you have already downloaded data from Replica with this runner, the runner will skip the download phase of the runner and only process the already-downloaded data.

This runner also depends on the contents of `./input/replica_interest_area_polygons`. This folder should contain one or more GeoJSON files. **Each GeoJSON file should contain a single polygon that defines an area of interest.** The file name should match the name of the area as it should appear in all generated datasets and on the web dashboard. For example, `City of Travelers Rest.geojson`.

You must provide `full_area.geojson`, which is a collection of tesselated hexagons that defines the extent of the data you want to download from Replica. This polygon should be the union of all other areas of interest. For example, if you have three areas of interest (Area A, Area B, and Area C), `full_area.geojson` should be a single polygon that encompasses all three areas.

> [!CAUTION]
> If the `full_area.geojson` polygon does not fully encompass all other areas of interest, the outputs will be inaccurate.

> [!CAUTION]
> If the `full_area.geojson` polygon is not broken into sufficiently small tesselations, the queries to the database will be too large, and the data pipeline will fail.

> [!NOTE]
> To optimize the amount of data downloaded from Replica, you should ensure that the `full_area.geojson` polygon is as small as possible while still fully encompassing all other areas of interest. 

To generate statistics and vector tiles for the full area, you must include `INCLUDE_FULL_AREA_IN_AREAS=1` in your `.env` file. If you do not want to generate statistics and vector tiles for the full area, set this variable to `0`. The default value is `0`.

To constrain the downloaded data by year or quarter, you may include `REPLICA_YEARS_FILTER` and `REPLICA_QUARTERS_FILTER` in your `.env` file. `REPLICA_YEARS_FILTER` should be a comma-separated list of years (e.g., `2022,2023`). `REPLICA_QUARTERS_FILTER` should be a comma-separated list of quarters (Q2 or Q4). For example, to download data for the fourth quarters of 2022 and 2023, you would set `REPLICA_YEARS_FILTER=2022,2023` and `REPLICA_QUARTERS_FILTER=Q4`. By default, all available years and quarters are downloaded.

To use the BigQuery Storage API, specify `USE_BIGQUERY_STORAGE_API=1` in your `.env` file. The default value is `0`. The BigQuery Storage API enables significantly faster downloads of large datasets. However, it may incur additional costs.

#### Dependencies

This runner depends on the output of the `greenlink_gtfs` runner. It uses the generated service areas to calculate transit accessibility statistics.

#### Actions

This runner is broken into two main phases: downloading data from Replica and processing the downloaded data.

**Phase 1. Download**

1. Query Replica's BigQuery datasets to determine which datasets.
2. Read the `full_area.geojson` file. Dissolve all polygons into a single polygon.
3. Convert the geometry to WKT format.
4. For each season:
   1. Submit a query for the entire network segents table (limit to id, street name, and geometry columns).
   2. Convert the query results to a [geopandas](https://geopandas.org/en/stable/) [GeoDataFrame](https://geopandas.org/en/stable/docs/reference/geodataframe.html).
   3. Save the GeoDataFrame to a [GeoParquet](https://geoparquet.org/) file.
5. For each season:
   1. Submit a query for the entire population table, filtering to only include rows which fall within the `full_area.geojson` geometry.
   2. Convert the query results to separate geopandas GeoDataFrames for: home location, school location, and work location.
   3. Save each GeoDataFrame to a separate GeoParquet file.
6. For each season and day (thursday and saturday):
   1. Generate chunked queries. These are queries that each download a subset of the entire trips table. Each chunked query filters to only include rows which fall within the `full_area.geojson` geometry. Queries are chunked in case the geometry is very large and would cause a single query to exceed BigQuery's limits. Queries are generated by selecting a subset of the tesselations in the `full_area.geojson` geometry until the query is close to the target size.
   2. For each chunked query, perform the following steps in parallel threads with other chunked queries:
      1. Check if the chunk has already been downloaded successfully. If so, skip to the next chunk.
      2. Submit the chunked query.
      3. Convert the query results to a geopandas GeoDataFrame.
      4. Convert results clumns that contain lists/arrays into comma-separated strings.
      5. Save the chunk to the download cache as a GeoParquet file.
      6. Mark the chunk as successfully downloaded.
   3. Repartition the download chunks into a collection of files that are each less than 100MB in size. This ensures that subsequent processing steps do not require too much memory. One 100MB partition is around 1GB once loaded into memory and prior to subsequent processing. (Repartioning is done in-memory.)
   4. For each partition, assign geometry by finding each segment ID in the network segments (from step 4) and constructing a complet [MultiLineString](https://shapely.readthedocs.io/en/stable/reference/shapely.MultiLineString.html) from the ordered combination of segment geometries.
   5. Save each partition (with geometry assigned) as a GeoParquet file.

> [!NOTE]
> Phase 1 will only download data that has not already been downloaded. If you re-run this runner, it will either skip this phase entirely (if all data has already been downloaded) or only download missing data.
> To re-download all data, you must delete the contents of the trip data download cache located at `./data/replica/full_area/download` and each .parquet file in the population and network_semgnets folders prior to re-running this runner.

**Phase 2. Process**

1. Read the list of downloaded datasets from phase 1.
2. Ensure that all requeired files from phase 1 are present. If any files are missing, abort processing.
3. Read the areas from `./input/replica_interest_area_polygons`.
4. Calculate a hash of the input areas and seasons. This is used for store cached processing results.
5. If the population statistics are already cached, read the cache. Otherwise:
   1. For each season:
      1. Read the population GeoParquet files from phase 1 and the walking and biking service areas from the `greenlink_gtfs` output.
      2. For each area:
         1. Read the area geometry and find the union of all polygons.
         2. Clip the season-level data to the area geometry.
         3. Create a unified population GeoDataFrame by combining the home, school, and work locations. Remove duplicate sythentic individuals.
         4. Count synthetic population and households.
         5. Count synthetic population and households in the walking and biking service areas.
         6. Save the clipped and unified population GeoDataFrames to file.
   2. Save the combined statistics to the processing cache.
6. For each trip day and season combination, if the trip summaries are already cached, read the cache. Otherwise:
   1. Read the trips chunks from phase 1 and the walking and biking service areas from the `greenlink_gtfs` output.
   2. For each chunk and area:
      1. Read the area geometry and find the union of all polygons.
      2. Filter the trips chunk to only include trips that start, travel through, or end within the area geometry.
      3. Save the filtered trips chunk to file.
   3. For each area:
      1. Count how many trips occurred.
      2. Count the median commute time.
      3. Count the destination building uses for each trip purpose (e.g., employment destinations) that fall within the walking and biking service areas. Trips are filtered to only include 
      4. Find and count which trips could have been served by public transit despite the synthetic individual not using public transit (the entire trip route occured within the walking or biking service area).
   4. Save the combined statistics to the processing cache.
7. Save the trip and population statistics to the output folder, separated by area and season.
8. For each season and area combination, generate vector tiles for each travel method (walking, biking, public transit, carpool, etc.) that visualize the density of trips for each network segment.

> [!NOTE]
> Phase 2 will attempt to restore cached statistics. If you re-run this runner in the exact same configuration of years and quarters, it will skip many processing steps by restoring cached results.
> To re-process all data, you must delete the cache files in `./data/replica` prior to re-running this runner.

> [!NOTE]
> Phase 2 will only generate vector tiles for network segments that have not already be generated or skipped. Delete the contents of `./data/replica/<area>/network_segments` prior to re-running this runner to re-generate all vector tiles.

#### Outputs

This runner stores all outputs in the `./data/replica` folder. The outputs are organized by area and season. For example, `./data/replica/City of Travelers Rest/2023/Q4`.

</details>
<details>
<summary><h3><code>essential_services</code></h3></summary>

This runner creates spatially-enabled datatsets of essential services and calculates their accessibility via public transit.

#### Inputs

The datasets for essential services must be geocoded prior to running this runner. See the `geocoder` runner documentation for more information about how to geocode addresses. In particular, the recommended datasets listed in the `geocoder` runner documentation should be geocoded and placed in the `./data/geocoded` folder. The `geocoder` runner will place geocoded datasets in this folder.

The following inputs are expected to be present in the `./data/geocoded` folder:
- `geocoded_grocery_stores__<date>.geojson`
- `geocoded_childcare__<date>.geojson`
- `geocoded_dental__<date>.geojson`
- `geocoded_eye_care__<date>.geojson`
- `geocoded_family_medicine__<date>.geojson`
- `geocoded_free_clinics__<date>.geojson`
- `geocoded_hospitals__<date>.geojson`
- `geocoded_internal_medicine__<date>.geojson`
- `geocoded_urgent_care__<date>.geojson`

Additionally, provide zoning information for Greenville County, SC in the `./input/zoning` folder. This folder should contain folders which contain a Shapefile for the zoning for the County. Each folder should be named in the format `YYYY-MM-DD`, where `YYYY-MM-DD` is the date of the zoning data. For example, `2023-01-31`.

#### Dependencies

This runner depends on the outputs of the `geocoder` and `greenlink_gtfs` runners.

#### Actions

1. Collect all geocoded datasets from the `./data/geocoded` folder.
2. For each essential service dataset, area, and season combination:
   1. Find the temporally closest essential service locations for the season.
   2. Save a copy of the temporally closest essential service locations to file.
   3. Draw a 400-meter (~0.25-mile) geodesic buffer around each location.
   4. Based on all recorded public transit trips from the Replica dataset, calculate the mean time take to travel to each geodesic buffer by public transit.
   5. Save the location buffers to file.
   6. Calculate an access zone buffer (varies by essential service) around each location.
   7. Calculate the proportion of the synthetic poluation (from Replica) that lives within the access zone buffer. This indicates the proportion of the population that has access to the essential service.
   8. Save the access zone buffer to file.
3. Save statistcs about essential services access for each area and season combination to file.
4. Save the combined statistics across all years to file.

#### Outputs

This runner stores all outputs in the `./data/essential_services` folder.

For each season, the temporally closest essential service locations are stored in `./data/essential_services/<area>/<year>/<Q2 or Q4>/<essential_service>.geojson`.

For each season-area combination, the access buffers, destination buffers, and access statistics are stored in `./data/essential_services/<area>/<year>/<Q2 or Q4>/<essential_service>__access.geojson`, `./data/essential_services/<area>/<year>/<Q2 or Q4>/<essential_service>__desintation_zones.geojson`, and `./data/essential_services/<area>/<year>/<Q2 or Q4>/access_stats.json`.

The access statistics across all years are stored in `./data/essential_services/essential_services_stats.json`.

</details>
<details>
<summary><h3><code>future_routes</code></h3></summary>

The `future_routes` runner calculates demographics for the areas served by proposed future transit routes and estimates what percentage of trips in the route's service area could be served by the route. Many of the statistics calculated by this runner are equivalent to those calculated by the `replica` runner.

#### Inputs

All inputs should be placed in the `./input/future_routes` folder. This folder should contain one subfolder for each future route. Each subfolder should be named after the route. For example, `Prisma Circulator`.

Each subfolder should contain the following files:
- `route.geojson`: The geometry of the future route. This should be a `FeatureCollection` of `LineString`s.
- `stops.geojson`: The stops along the future route. This should be a `FeatureCollection` of `Point`s.
- `walkshed.geojson`: The walking service area for the future route. This should be a `FeatureCollection` of `Polygon`s.
- `bikeshed.geojson`: The biking service area for the future route. This should be a `FeatureCollection` of `Polygon`s.
- `paratransit.geojson`: The paratransit service area for the future route. This should be a `FeatureCollection` of `Polygon`s


#### Preparing the future route layers

The future routes are based on the [2021 Transit Development Plan Update](https://content.civicplus.com/api/assets/de77f1ba-c64b-406e-acc7-e59bb9f725a2). Greenlink staff provide shapefiles that encompass future routes. Future routes and stops are provided in separate features. Each route and associated stops must be separated into separate files using a GIS (e.g., ArcGIS Pro, QGIS, etc.). Walksheds, bikesheds, and paratransit buffers are then generated for each future route and associated stops.

##### Isolating single, future routes and stops

1. Use an attribute query to select a single, future route by line_name (e.g., 'US 123 all day'). This will select both the inbound and outbound route.
2. Export this selection as a new feature class.
3. Export this feature class to GeoJSON into the appropriate directory (e.g., `./input/future_routes/US 123`) using the `route.geojson` file name. In ArcGIS Pro, only check `Output to GeoJSON` and `Project to WGS84`.
4. Bus stops can be dedicated to an individual route or shared between routes. This is indicated in the `lines` attribute of the combined future stops feature class. For stops that are shared between routes, the routes are separated by a ',' (e.g., '502 White Horse (Inbound), US 123 all day (Outbound)'). To ensure that all stops associated with a route are selected, structure the attribute query to be inclusive of variations of the line_id. For example, for stops associated with route 'US 123 all day'.
```sql
stops.lines LIKE '%US 123 all day%'
```
5. Export this selection as a new feature class.
6. Export this feature class to GeoJSON into the appropriate directory (e.g., `./input/future_routes/US 123`) using the `stops.geojson` file name. In ArcGIS Pro, only check `Output to GeoJSON` and `Project to WGS84`.
7. Repeat this for all future routes that are to be added to the dashboard.

##### Creating walksheds and bikesheds

Walk and bikesheds are based on the stops associated with each route. ArcGIS Pro or ArcGIS Online is required to generate these areas to take advantage of ESRI's built-in network dataset. In ArcGIS Pro:

1. 

##### Creating paratransit buffers


#### Dependencies

This runner depends on the outputs of the `replica` and `greenlink_gtfs` runners.

#### Actions

For each future route: where the required input files are present:

1. Find the trips that could be be served by the future route. These are trips that wholly fall within the walking or biking service area of the future route.
2. Save the trips that could be served by the future route to file.
3. Count the number of trips by travel method (walking, biking, public transit, carpool, etc.).
4. Count the median commute time.
5. Count the destination building uses for each trip purpose (e.g., employment destinations).
6. Measure how much of the synthetic population (from Replica) lives within the walking and biking service areas.
   1. Load the population (home) GeoDataFrame from the `replica` runner for `full_area.geojson`.
   2. Count the number of synthetic individuals and households that fall within the walking and biking service areas.
7. Calculate the distance of the future route.
8. Count the number of stops along the future route.
9. Calculate the perimeter and area of the walking and biking service areas.
10. Copy the input files to the output folder.
11. Save all output statistics to file.

#### Outputs

For each input future route, this runner stores all outputs in the `./data/future_routes/<route_name>` folder. Outputs include:
- `route.geojson`: (from the input folder)
- `stops.geojson`: (from the input folder)
- `walkshed.geojson`: (from the input folder)
- `bikeshed.geojson`: (from the input folder)
- `paratransit.geojson`: (from the input folder)
- `walk_convertable_trips.geojson`: The non-public-transit trips from the latest season from the `replica` runner that wholly fall within the walking service area.
- `bike_convertable_trips.geojson`: The non-public-transit trips from the latest season from the `replica` runner that wholly fall within the biking service area.
- `stats.json`: Statistics about the future route. Open the generated file to see the exact statistics.

</details>

## Preparing the data for the web application

The `finalize` step is a special runner/ETL that prepares the data for use by the web application. It collects outputs from all other runners and organizes them into a single folder structure that the web application can read.
It always runs after other selected ETLs have completed.

### Actions

1. Create the `./data/__public` folder if it does not already exist. If it already exists, delete all its contents.
2. Create symlinks from the outputs of all other runners to the `./data/__public` folder that are used by the web application. If the operating system does not support symlinks, the files are copied instead. Include file types are `.json`, `.geojson`, `.deflate`, `.md`, and `.vectortiles`.
3. If `replica` data are present, simple index text files are generated to list the available areas and seasons. These index files are stored in `./data/__public/replica`.
4. If `future_routes` data are present, a simple index text file is generated to list the available future routes. This index file is stored in `./data/__public/future_routes`.
5. Remove empty folders and other data that are not meant to be included.
6. Compress (deflate) all JSON and GeoJSON files in the `./data/__public` folder to reduce file size and improve web application performance. This step replaces the original uncompressed files with the compressed versions, which have an additional `.deflate` file extension.
7. Create file indices for each `.vectortiles` file in the `./data/__public` folder. `.vectortiles` files are TAR archives or ZIP archives that contains an entire vector tile dataset. The index allows us to query a small byte range from the archive instead of downloading the entire archive. This significantly improves performance when loading vector tiles in the web application, and it also eliminates the need to extract the entire archive to access indiviual tiles (millions of small files). The `.vectortiles` files are converted to `.tar`, and the index files are stored alongside the original `.tar` files with an additional `.index` file extension.

### Outputs

The prepared data for the web application is stored in the `./data/__public` folder.

## Running a subset of the data pipeline (updating the output with new data)

To run a subset of the data pipeline to update the outputs with new data, add `--etls=<etl1>,<etl2>,...` to the command used to run the pipeline. Replace `<etl1>,<etl2>,...` with a comma-separated list of the ETL names you want to run. For example, to only run the `replica` and `greenlink_ridership` ETLs, you would add `--etls=replica,greenlink_ridership` to the command:

   ```bash
   docker run --rm -it --volume ./input:/input --volume ./data:/data --volume ./gbq-credentials:/credentials --user $(id -u):$(id -g) --env-file .env ghcr.io/shi-institute/gc-mobility-dashboard-data-pipeline:latest --etls=replica,greenlink_ridership
   ```

When running a subset of the data pipeline, ensure that all dependencies for the selected ETLs are met. If an ETL depends on another ETL that is not being run, you must ensure that the outputs from the dependent ETL are already present in the `./data` folder. 

Consider whether data from dependent ETLs needs to be updated as well. When updating data, it is important to consider the relationships between different datasets. Some datasets may depend on others, and updating one dataset without updating its dependencies may lead to inconsistencies or inaccuracies in the outputs.

> [!CAUTION]
> The web dashboard lists its available seasons based on the data present in the `replica` output. However, other runners/ETLs may also generate outputs for specific seasons. When updating data for a new season, ensure that all relevant ETLs are updated to include data for the new season, not just the `replica` ETL.

### Examples

#### Updating for new Replica data

According to the `replica` section above, it is dependent on the `greenlink_gtfs` runner. Therefore, when updating for new Replica data, you should run both the `replica` and `greenlink_gtfs` ETLs.

Additionally, other ETLs depend on the output of the `replica` ETL. Therefore, you should also run the following ETLs to ensure that all outputs are updated with the new Replica data:
- `essential_services`
- `future_routes`
- `greenlink_ridership`
- `greenlink_gtfs`
- `geocoder`

The dashboard also needs updated Census data to match the new Replica data. Therefore, you should also run the `census` ETL.

After every run, you should run the `finalize` ETL to prepare the data for use by the web application.

In summary, to update for new Replica data, you should run all but the `passthrough` ETL. Since the `passthrough` ETL is
extremely fast, you may choose to run all ETLs including `passthrough` for simplicity.

#### New Greenlink rider data

Updating the Greenlink ridership data only requires running the `greenlink_ridership` ETL. However, since the `greenlink_ridership` ETL depends on the output of the `greenlink_gtfs` ETL, you should also run the `greenlink_gtfs` ETL to ensure that the ridership data is accurate. Also, after running these ETLs, you should run the `finalize` ETL to prepare the data for use by the web application.

In summary, when updating for new Greenlink rider data, you should run the following ETLs:
- `greenlink_gtfs`
- `greenlink_ridership`
- `finalize`

#### New essential services data

The `essential_services` ETL depends on the output of the `geocoder` and `greenlink_gtfs` ETLs. Therefore, when updating for new essential services data, you should run the following ETLs:
- `geocoder`
- `greenlink_gtfs`
- `essential_services`
- `finalize`

## Required passthrough data

This section describes the input files for the `passthrough_data` runner. These files are used by the web application and must be structured in a specific way.
Follow the instructions for updating data described in the following sections to ensure the web app does not break.

### `operating_funds.json`

TODO: @mwiniski
- data source (with links)
- structuring the JSON (include a short snippet in a code fence)

### `tab5_scenarios.json`

TODO: @mwiniski
- relationship to `future_routes` ETL
- data sources (Greenlink - costs; Census - demographics)
- structure of then JSON: how scenarios and features fit together. Point to https://github.com/shi-institute/gc-mobility-dashboard/blob/3e48b186564f8e239dba75d83897b701ddec2839/frontend/src/data.d.ts#L584-L652?

## Developing

### Get started with Visual Studio Code

We have provided a Visual Studio Code workspace to make it easier to develop and run the data pipeline.

#### Step 1. Open Visual Studio Code

If you do not have visual studio code installed, you may download it from
https://code.visualstudio.com/download.

#### Step 2. Clone this repository to your device

Open the **Source Control** view container (Ctrl + Shift + G) and choose **Clone Respository**.

When prompted, provide this URL: `https://github.com/shi-institute/gc-mobility-dashboard.git`.

If you prompted to choose a folder to clone into, choose a location where it is acceptable for
a new folder named "gc-mobility-dashbaord" to be created.

When the cloning process is complete, click **Open** to open the cloned repository.

#### Step 3. Install the recommended extensions and open the workspace

You will receive a notification to install the recommended extensions. Install them.

If you are not prompted, you may already have the recommended extensions.

If the recommended extensions are all installed, the window will reload an open
`Greenville Connects Mobility Dashboard.code-workspace` automatically. Confirm that
the workspace is open be checking if "(Workspace)" is in the window title.

#### Step 4. Create the conda environment

Conda environments ensure that the exact same set of packages or libraries can
be installed on every device that uses this data pipeline.

You need to install the conda environment so that Visual Studio Code can see
which packages are installed and provide features like linting and code completion.

**Method 1. Visual Studio Code**

In the **Explorer** view container (Ctrl + Shift + E), expand the **Tasks** view.

Click **Ensure conda environment exists** to create the conda environent.

*Note: To update the conda environment once it is created, click **Update conda environment**.
This is useful if a new dependency has been added to environment.yaml since you last
created the conda environment.*

**Method 2. Command line**

Start a terminal in the `/data-pipeline` directory. Then, run the following command to create the conda environment:

`conda env list | grep $(pwd)/env || conda env create --file environment.yaml --prefix ./env`

*Note: To update the conda environment once it is created, run
`conda env create --file environment.yaml --prefix ./env`. This is useful if a new dependency has
been added to environment.yaml since you last created your conda environment.*

### Running the pipeline after making changes

If you are using the Visual Studio Code workspace, run the **Pipeline (docker)** task.

The pipeline outputs all data to the data-pipeline/data folder.

*Note: The `frontend` project copies data from the `data-pipeline/data` folder.
It skips files with extensions `.tmp` and `.variables`.*

Some pipelines require input data files or specified environment variables.
See the documentation for each pipeline for more information.

### Developing pipelines

Every data source should have its own folder in `src/etl/sources`. In each source
folder, a class for downloading, processing, and exporting the data should be
provided in the `etl.py` file. Additional python files for constants or helpers
may be included in the source's folder. Helpers that may be useful for multiple
pipelines may be included in `src/etl`.

All ETLs are triggered from the `etl_runner` function in `src/etc/runner.py`.
Each new ETL should be added to the `etl_runner` function.
