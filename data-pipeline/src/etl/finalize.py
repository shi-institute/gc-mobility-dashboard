import os
import re
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import TypedDict

from tqdm import tqdm

FILE_EXTENSIONS_TO_MOVE = ['.json', '.geojson', '.deflate', '.vectortiles', '.md']
PIPELINE_DATA_DIR = './data'
PUBLIC_DIR_NAME = '__public'

data_dir = Path(PIPELINE_DATA_DIR).resolve()
public_dir = data_dir / PUBLIC_DIR_NAME


def finalize():
    """
    Grabs the data from the ETL process that will be used by the frontend,
    compresses it, and packages it into a zip file for each deployment.
    """
    print('\nPreparing to copy files for distribution...')

    # ensure the public directory exists and is empty
    shutil.rmtree(public_dir, ignore_errors=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    # collect all approved files to copy from the data directory to the public directory
    items_to_copy = []
    total_bytes = 0
    for item in data_dir.rglob('*'):
        # skip anything inside __public
        if PUBLIC_DIR_NAME in item.parts:
            continue

        if should_copy_file(item):
            items_to_copy.append(item)
            if item.is_file():
                total_bytes += item.stat().st_size
    print(f'  Found {len(items_to_copy)} files to link or copy ({total_bytes // 1000000} MB).')

    # copy with progress bar
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(tqdm(pool.map(link_or_copy, items_to_copy), total=len(
            items_to_copy), desc="Linking or copying files"))

    # recursively delete empty directories in public/data
    print("Deleting empty directories...")
    delete_empty_directories(public_dir)

    # build an index of areas and seasons for the replica data
    area_names = build_area_index(public_dir / 'replica')
    if len(area_names) > 0:
        seasons = build_season_index(public_dir / 'replica' / area_names[0] / 'statistics')
    else:
        seasons = []

    # buld an index of future routes
    build_future_routes_index(public_dir / 'future_routes')

    # delete replica data for areas and seasons that are not in the area and season indexes
    replica_dir = public_dir / 'replica'
    if replica_dir.exists():
        print("Omitting unindexed replica data...")
        valid_season_names = {
            f"{season['year']}_{season['quarter']}" for season in seasons}  # e.g., '2021_Q2'
        pattern = re.compile(r"\d{4}_Q[1-4]")  # matches season file names like '_2021_Q2'
        for area_dir in replica_dir.iterdir():
            if not area_dir.is_dir():
                continue

            # remove area directories not in the area index
            if area_dir.name not in area_names:
                shutil.rmtree(area_dir)
                continue

            # remove season files not in the season index
            for file in area_dir.rglob("*"):
                # check for a season string (YYYY_Q#) in the file stem
                match = pattern.search(file.stem)
                if not match:
                    continue

                # check if the season is in the valid seasons list
                season_name = match.group(0)
                if season_name not in valid_season_names:
                    file.unlink()

    # compress JSON files in public/data
    deflate_json_files(public_dir)

    # repackage .vectortiles files in public/data as cloud-optimized tar files
    cloud_optimize_vectortiles(public_dir)

    # # put the public dir in an uncompressed tar file for easy transfer
    # tar_path = data_dir / '__public.tar'
    # print(f'Creating uncompressed tar file: {tar_path}')
    # with tarfile.open(tar_path, 'w') as tar:
    #     tar.add(public_dir, arcname=PUBLIC_DIR_NAME)

    print('Done copying and processing data')

    # count the total bytes in the final output
    final_total_bytes = 0
    for item in public_dir.rglob('*'):
        if item.is_file():
            final_total_bytes += item.stat().st_size
    print(f'  Final output size: {final_total_bytes // 1000000} MB.')

    return


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


def link_or_copy(item: Path) -> None:
    """
    Create a symlink from item in data_dir to the corresponding location in public_dir.
    If symlinking fails, copy the file instead.

    This method is much faster because it avoids duplicating data on disk.

    Args:
        item (Path): The file or directory to link or copy.
    """
    relative = item.relative_to(data_dir)
    dest = public_dir / relative
    try:
        if item.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            # create symlink if not exists
            if not dest.exists():
                os.symlink(os.path.abspath(item), dest)
    except OSError as e:
        tqdm.write(f"Symlink failed for {item}: {e} — copying instead.")
        try:
            shutil.copy(item, dest)
        except Exception as e2:
            tqdm.write(f"Fallback copy failed for {item}: {e2}")


def delete_empty_directories(path: Path) -> None:
    """Recursively delete empty directories."""
    for dirpath, _, __ in os.walk(path, topdown=False, followlinks=False):
        directory_path = Path(dirpath)

        # skip symlinks
        if directory_path.is_symlink():
            continue

        try:
            # delete the directory if empty
            if not any(directory_path.iterdir()):  # note that we must re-check since the children may have been deleted
                directory_path.rmdir()
        except OSError:
            pass


def deflate_json_files(directory: Path) -> None:
    """Deflate all .json and .geojson files in the given directory and its subdirectories."""
    import zlib

    # Find all .json and .geojson files
    json_files = list(directory.rglob('*.json'))
    geojson_files = list(directory.rglob('*.geojson'))
    all_json_files = json_files + geojson_files

    count = len(all_json_files)
    if count == 0:
        print("No .json or .geojson files found to deflate")
        return

    for json_file in tqdm(all_json_files, desc="Deflating JSON files"):
        with open(json_file, 'rb') as f_in:
            compressed_data = zlib.compress(f_in.read())
            with open(f'{json_file}.deflate', 'wb') as f_out:
                f_out.write(compressed_data)
        json_file.unlink()  # remove the original .json file


def _index_vectortiles(vectortiles_file: Path) -> None:
    try:
        tar_output = vectortiles_file.with_suffix('.tar')

        if zipfile.is_zipfile(vectortiles_file):
            with tempfile.TemporaryDirectory() as tmpdir:
                # extract to a folder in a temp directory
                with zipfile.ZipFile(vectortiles_file, 'r') as zip_ref:
                    zip_ref.extractall(tmpdir)

                # delete the original .vectortiles file
                vectortiles_file.unlink()

                # create unoptimized tar
                result = subprocess.run(
                    ['cotar', 'tar', tar_output.resolve().as_posix(), './'],
                    check=True,
                    cwd=tmpdir,
                    capture_output=True,
                    text=True
                )
                if result.stderr:
                    tqdm.write(result.stderr)

        elif tarfile.is_tarfile(vectortiles_file):
            # resolve the symlink to the actual/original file path
            real_src = os.path.realpath(vectortiles_file)

            # copy the tar file directly
            shutil.copy2(real_src, tar_output)

            # delete the symnlink (not the original file)
            os.remove(vectortiles_file)
        else:
            raise ValueError(f"{vectortiles_file} is not a valid zip or tar file")

        # create index for the tar file using node.js
        try:
            npm_root = subprocess.run(
                ["npm", "root", "-g"], capture_output=True, text=True, check=True
            ).stdout.strip()
            env = os.environ.copy()
            env["NODE_PATH"] = npm_root

            script_path = Path('./src/cotar/createCotarIndex.mjs').resolve()
            result = subprocess.run(
                ['node', script_path.name, '/' + tar_output.as_posix()],
                check=True,
                cwd=script_path.parent,
                env=env,
                capture_output=True,
                text=True
            )

            if result.stderr:
                tqdm.write(result.stderr)

        except subprocess.CalledProcessError as e:
            tqdm.write(f"Node.js failed:\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}")
            raise

        except Exception as index_error:
            tqdm.write(f"Error creating index for {tar_output.name}: {index_error}")
            raise

    except Exception as error:
        tqdm.write(f"Error repackaging {vectortiles_file.name}: {error}")


def cloud_optimize_vectortiles(directory: Path) -> None:
    """
    Recursively look for .vectortiles files in a directory and its subdirectories.

    If found, repackage them into cloud-optimized tar files using cotar.
    """
    vectortiles_files = list(directory.rglob('*.vectortiles'))
    total_files = len(vectortiles_files)

    if total_files == 0:
        print("No .vectortiles files found")
        return

    with ThreadPoolExecutor() as executor:
        futures = {executor.submit(_index_vectortiles, vectortiles_file): vectortiles_file
                   for vectortiles_file in vectortiles_files}

        for _ in tqdm(as_completed(futures), total=total_files,
                      desc="Optimizing vector tiles"):
            pass


def build_area_index(replica_directory: Path) -> list[str]:
    """
    Builds an index of areas from the list of folder names in the given directory.

    Args:
        replica_directory: Path to the directory to scan for area folders

    Returns:
        List of area names (directory names)
    """
    if not replica_directory.exists():
        return []

    print(
        f"Building area index from directory: {replica_directory.resolve().relative_to(data_dir).as_posix()}")

    area_names = []
    for item in replica_directory.iterdir():
        if item.is_dir():
            area_names.append(item.name)

    # sort alphabetically, but put 'full_area' first if it exists and may be included
    area_names.sort()
    if 'full_area' in area_names:
        area_names.remove('full_area')
        if os.getenv('INCLUDE_FULL_AREA_IN_AREAS', '0') == '1':
            area_names.insert(0, 'full_area')

    # write the area names to a text file
    area_index = '\n'.join(area_names)
    index_file_path = replica_directory / 'area_index.txt'
    with open(index_file_path, 'w') as f:
        f.write(area_index)
    print(f"  Area index written to: {index_file_path.resolve().relative_to(data_dir).as_posix()}")

    return area_names


class SeasonIndexEntry(TypedDict):
    year: int
    quarter: str


def build_season_index(stats_directory: Path) -> list[SeasonIndexEntry]:
    """
    Builds an index of seasons from the first area in data/replica.

    Args:
        stats_directory: Path to the directory to scan for season files
    """
    if not stats_directory.exists():
        return []

    print(
        f"Building seasons index from directory: {stats_directory.resolve().relative_to(data_dir).as_posix()}")

    season_names: list[str] = []
    for item in stats_directory.iterdir():
        if item.is_file() and (item.suffix == '.geojson' or item.suffix == '.json' or '.geojson.deflate' in item.name or '.json.deflate' in item.name):
            name = item.name
            name = name.replace('replica__', '')
            name = name.split('__')[0]
            name = name.replace('south_atlantic_', '')
            name = name.replace('.geojson', '')
            name = name.replace('.json', '')
            name = name.replace('.deflate', '')
            season_name = ':'.join(reversed(name.split('_')))
            season_names.append(season_name)

    unique_season_names = list(set(season_names))

    # sort newest to oldest
    unique_season_names.sort(key=lambda x: (int(x.split(':')[1]), x.split(':')[0]), reverse=True)

    # write the season quarter-year pairs to a text file
    season_index = '\n'.join(unique_season_names)
    season_index_path = stats_directory / '../../season_index.txt'
    with open(season_index_path, 'w') as f:
        f.write(season_index)
    print(
        f"  Season index written to: {season_index_path.resolve().relative_to(data_dir).as_posix()}")

    result: list[SeasonIndexEntry] = [
        {"year": int(year), "quarter": quarter}
        for quarter, year in (name.split(":") for name in unique_season_names)
    ]
    return result


def build_future_routes_index(future_routes_directory: Path) -> None:
    """
    Builds an index of future routes from the given directory.

    Args:
        future_routes_directory: Path to the directory to scan for future routes
    """
    print(
        f"Building future routes index from directory: {future_routes_directory.resolve().relative_to(data_dir).as_posix()}")

    if future_routes_directory.exists():
        future_routes_index_path = future_routes_directory / 'future_routes_index.txt'
        future_routes = [item for item in future_routes_directory.iterdir()
                         if item.is_file() or item.is_dir()]

        # sort alphabetically
        future_routes.sort(key=lambda x: x.name.lower())

        # write the future route names to a text file
        future_routes_index = '\n'.join([item.name for item in future_routes])
        with open(future_routes_index_path, 'w') as f:
            f.write(future_routes_index)
        print(
            f"  Future routes index written to: {future_routes_index_path.resolve().relative_to(data_dir).as_posix()}")
