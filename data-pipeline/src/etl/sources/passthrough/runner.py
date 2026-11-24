import os
from pathlib import Path
import shutil


def source_runner():
    input_folder = './input/passthrough_data'
    alt_input_folder = './input/passthrough'
    output_folder = './data'

    # clear existing output folder child files
    for item in os.listdir(output_folder):
        item_path = os.path.join(output_folder, item)
        if os.path.isfile(item_path):
            os.remove(item_path)

    # delete folders in the output that will be replaced
    # by folders in the input and alt input folders
    input_folder_subfolder_names = []
    if os.path.isdir(input_folder):
        for item in os.listdir(input_folder):
            path = Path(os.path.join(input_folder, item))
            if path.is_dir():
                input_folder_subfolder_names.append(path.name)
    if os.path.isdir(alt_input_folder):
        for item in os.listdir(alt_input_folder):
            path = Path(os.path.join(alt_input_folder, item))
            if path.is_dir():
                input_folder_subfolder_names.append(path.name)
    print(f"Deleting output subfolders: {input_folder_subfolder_names}")

    # copy the input/passthrough_data folder contents to the output folder
    if os.path.isdir(input_folder):
        shutil.copytree(input_folder, output_folder, dirs_exist_ok=True)
    if os.path.isdir(alt_input_folder):
        shutil.copytree(alt_input_folder, output_folder, dirs_exist_ok=True)
