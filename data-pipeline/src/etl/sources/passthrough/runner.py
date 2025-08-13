import shutil


def source_runner():
    # copy the input/passthrough_data folder contents to the output folder
    input_folder = './input/passthrough_data'
    output_folder = './data'
    shutil.copytree(input_folder, output_folder, dirs_exist_ok=True)
