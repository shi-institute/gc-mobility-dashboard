# Greenville Connects Mobility Dashboard Data Pipeline

The data pipeline downloads and processes the data used by the dashboard.
It exports static files that can be used by the dashboard frontend.

The data pipeline has been tested on Ubuntu 24.

## Prerequisite software

- Ubuntu 24.04 LTS
- Conda (we recommend [miniforge](https://github.com/conda-forge/miniforge?tab=readme-ov-file#unix-like-platforms-macos-linux--wsl))

## Getting started

To get started, you have two options:
1. Use Visual Studio Code
2. Use the command line

### Get started with Visual Studio Code

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

In the **Explorer** view container (Ctrl + Shift + E), expand the **Tasks** view.

Click **Ensure conda environment exists** to create the conda environent.

*Note: To update the conda environment once it is created, click **Update conda environment**.
This is useful if a new dependency has been added to environment.yaml since you last
created the conda environment.*

### Get started via the command line

#### Step 1. Clone this repository to your device

Open a terminal on your Ubuntu 24.04 LTS system. Clone the respository to
your local system with git:

`git clone https://github.com/shi-institute/gc-mobility-dashboard.git`

#### Step 2. Create the conda environment

In the same terminal you used to clone the repository, navigate to the `/data-pipeline` directory:

`cd gc-mobility-dashboard/data-pipeline`

Then, run the following command to create the conda environment:

`conda env list | grep $(pwd)/env || conda env create --file environment.yaml --prefix ./env`

*Note: To update the conda environment once it is created, run
`conda env create --file environment.yaml --prefix ./env`. This is useful if a new dependency has
been added to environment.yaml since you last created your conda environment.*

## Usage

To run the data pipeline, run `python data-pipeline/src/main.py`.
If you are using the Visual Studio Code workspace, run the **Pipeline** task.

The pipeline outputs all data to the data-pipeline/data folder.

*Note: The `frontend` project copies data from the `data-pipeline/data` folder.
It skips files with extensions `.tmp` and `.variables`.*

Some pipelines require environment variables. Create a `.env` file at the root
of the `data-pipeline` folder. Include the following environment variables:
```env
CENSUS_API_KEY= # optional; only provide census API requests fail
```

Some pipelines require input data files. Each type of required or optional
data file input has a folder that contains a README.md file with instructions.
For example, the `replica` pipeline requires input geometries. It expects
multiple `.geojson` files, each with a single polygon, in the
`input/replica_interest_area_polygons` folder.

## Developing pipelines

Every data source should have its own folder in `src/etl/sources`. In each source
folder, a class for downloading, processing, and exporting the data should be
provided in the `etl.py` file. Additional python files for constants or helpers
may be included in the source's folder. Helpers that may be useful for multiple
pipelines may be included in `src/etl`.

All ETLs are triggered from the `etl_runner` function in `src/etc/runner.py`.
Each new ETL should be added to the `etl_runner` function.
