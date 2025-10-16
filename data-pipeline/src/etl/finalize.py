import os
import shutil
import subprocess
import tarfile
import threading
import zipfile
from pathlib import Path

from tqdm import tqdm

FILE_EXTENSIONS_TO_MOVE = ['.json', '.geojson', '.deflate', '.vectortiles']
PIPELINE_DATA_DIR = './data'
PUBLIC_DIR_NAME = '__public'


def finalize():
    """
    Grabs the data from the ETL process that will be used by the frontend,
    compresses it, and packages it into a zip file for each deployment.
    """
    data_dir = Path(PIPELINE_DATA_DIR)
    public_dir = data_dir / PUBLIC_DIR_NAME

    # ensure the public directory exists and is empty
    shutil.rmtree(public_dir, ignore_errors=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    # copy approved files from the data directory to the public directory
    def should_copy_file(source_path: Path) -> bool:
        """Filter function to determine if a file should be copied."""
        source_str = str(source_path)

        # always copy directories
        if source_path.is_dir():
            return True

        # only allow moving certain file types
        is_approved_extension = any(source_str.endswith(ext) for ext in FILE_EXTENSIONS_TO_MOVE)
        if not is_approved_extension:
            return False

        # only copy time series Census ACS 5-year data
        if 'census_acs_5year' in source_str:
            return source_str.endswith('time_series.json')

        return True
    for item in data_dir.rglob('*'):
        # skip anything inside __public
        if PUBLIC_DIR_NAME in item.parts:
            continue

        if should_copy_file(item):
            # calculate relative path from data directory
            relative_path = item.relative_to(data_dir)
            destination = public_dir / relative_path

            if item.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, destination)

    # recursively delete empty directories in public/data
    delete_empty_directories(data_dir)

    # compress JSON files in public/data
    deflate_json_files(public_dir)

    # repackage .vectortiles files in public/data as cloud-optimized tar files
    repackage_vectortiles(public_dir)

    # build an index of areas and seasons for the replica data
    area_names = build_area_index(public_dir / 'replica')
    if len(area_names) > 0:
        build_season_index(public_dir / 'replica' / area_names[0] / 'statistics')

    # buld an index of future routes
    future_routes_dir = public_dir / 'future_routes'
    if future_routes_dir.exists():
        future_routes_index_path = future_routes_dir / 'future_routes_index.txt'
        future_routes_index = '\n'.join(
            [item.name for item in future_routes_dir.iterdir() if item.is_file() or item.is_dir()])
        with open(future_routes_index_path, 'w') as f:
            f.write(future_routes_index)
        print(f"Future routes index written to: {future_routes_index_path}")

    # # zip the public directory
    # create_cloud_optimized_tar(public_dir)

    print('Done copying and processing data')
    return


def delete_empty_directories(path: Path) -> None:
    """Recursively delete empty directories."""
    if not path.is_dir():
        return

    # delete empty subdirectories first
    for subpath in path.iterdir():
        delete_empty_directories(subpath)

    # if the directory is now empty, delete it
    if not any(path.iterdir()):
        path.rmdir()


def deflate_json_files(directory: Path) -> None:
    """Deflate all .json and .geojson files in the given directory and its subdirectories."""
    import zlib

    # Find all .json and .geojson files
    json_files = list(directory.rglob('*.json'))
    geojson_files = list(directory.rglob('*.geojson'))
    all_json_files = json_files + geojson_files

    for json_file in all_json_files:
        with open(json_file, 'rb') as f_in:
            compressed_data = zlib.compress(f_in.read())
            with open(f'{json_file}.deflate', 'wb') as f_out:
                f_out.write(compressed_data)
        json_file.unlink()  # remove the original .json file


def unzip_vectortiles(directory: Path) -> None:
    """
    Recursively look for .vectortiles files in a directory and its subdirectories.

    If found, unzip them (they are zip files) and move them to the same directory.
    """
    import zipfile

    from tqdm import tqdm

    # Count total files first
    vectortiles_files = list(directory.rglob('*.vectortiles'))
    total_files = len(vectortiles_files)

    if total_files == 0:
        print("No .vectortiles files found")
        return

    print(f"Found {total_files} .vectortiles files to extract")

    for vectortiles_file in tqdm(vectortiles_files, desc="Extracting vector tiles"):
        try:
            # extract to a folder with the same name as the file (without .vectortiles)
            unzip_path = vectortiles_file.with_suffix('')

            with zipfile.ZipFile(vectortiles_file, 'r') as zip_ref:
                zip_ref.extractall(unzip_path)

            # delete the original .vectortiles file
            vectortiles_file.unlink()
        except Exception as error:
            print(
                f"Error processing file {vectortiles_file.name} in directory {directory}: {error}")


def repackage_vectortiles(directory: Path) -> None:
    """
    Recursively look for .vectortiles files in a directory and its subdirectories.

    If found, repackage them into cloud-optimized tar files using cotar.
    """
    # Find all .vectortiles directories
    vectortiles_files = list(directory.rglob('*.vectortiles'))
    total_files = len(vectortiles_files)

    if total_files == 0:
        print("No .vectortiles files found")
        return

    print(f"Found {len(vectortiles_files)} .vectortiles files to repackage")

    for vectortiles_file in tqdm(vectortiles_files, desc="Repackaging vector tiles"):
        try:
            # specify a tar file with same name as vectortiles_file but with .tar extension
            tar_output = vectortiles_file.with_suffix('.tar')

            # extract to a folder with the same name as the file (without .vectortiles)
            unzip_path = vectortiles_file.with_suffix('')
            with zipfile.ZipFile(vectortiles_file, 'r') as zip_ref:
                zip_ref.extractall(unzip_path)

            # delete the original .vectortiles file
            vectortiles_file.unlink()

            # create unoptimized tar
            result = subprocess.run(['cotar', 'tar', '../' + tar_output.name, './'],
                                    check=True, cwd=unzip_path, capture_output=True, text=True)
            # tqdm.write(result.stdout)
            if result.stderr:
                tqdm.write(result.stderr)

            # delete the unzipped directory
            shutil.rmtree(unzip_path)

            # create index for the tar file using node.js
            try:
                # determine the global npm root to set NODE_PATH to match globally installed packages
                npm_root = subprocess.run(
                    ["npm", "root", "-g"], capture_output=True, text=True, check=True
                ).stdout.strip()
                env = os.environ.copy()
                env["NODE_PATH"] = npm_root

                # run the node script
                script_path = Path('./src/cotar/createCotarIndex.mjs').resolve()
                result = subprocess.run(['node', script_path.name, '/' + tar_output.as_posix()],
                                        check=True, cwd=script_path.parent, env=env,
                                        capture_output=True, text=True)

                if result.stderr:
                    tqdm.write(result.stderr)

            except subprocess.CalledProcessError as e:
                tqdm.write(f"Node.js failed:\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}")
                raise

            except Exception as index_error:
                tqdm.write(f"Error creating index for {tar_output.name}: {index_error}")
                raise

        except Exception as error:
            print(f"Error repackaging {vectortiles_file.name}: {error}")


def build_area_index(replica_directory: Path) -> list[str]:
    """
    Builds an index of areas from the list of folder names in the given directory.

    Args:
        replica_directory: Path to the directory to scan for area folders

    Returns:
        List of area names (directory names)
    """
    print(f"Building area index from directory: {replica_directory}")

    area_names = []
    for item in replica_directory.iterdir():
        if item.is_dir():
            area_names.append(item.name)

    # write the area names to a text file
    area_index = '\n'.join(area_names)
    index_file_path = replica_directory / 'area_index.txt'
    with open(index_file_path, 'w') as f:
        f.write(area_index)
    print(f"Area index written to: {index_file_path}")

    return area_names


def build_season_index(stats_directory: Path) -> None:
    """
    Builds an index of seasons from the first area in data/replica.

    Args:
        stats_directory: Path to the directory to scan for season files
    """
    print(f"Building seasons index from directory: {stats_directory}")

    season_names = []
    for item in stats_directory.iterdir():
        if item.is_file() and (item.suffix == '.geojson' or item.suffix == '.json' or '.geojson.deflate' in item.name or '.json.deflate' in item.name):
            name = item.name
            name = name.replace('replica__', '')
            name = name.split('__')[0]
            name = name.replace('south_atlantic_', '')
            name = name.replace('.geojson.deflate', '')
            name = name.replace('.json.deflate', '')
            season_name = ':'.join(reversed(name.split('_')))
            season_names.append(season_name)

    unique_season_names = list(set(season_names))

    # write the season quarter-year pairs to a text file
    season_index = '\n'.join(unique_season_names)
    season_index_path = stats_directory / '../../season_index.txt'
    with open(season_index_path, 'w') as f:
        f.write(season_index)
    print(f"Season index written to: {season_index_path}")
