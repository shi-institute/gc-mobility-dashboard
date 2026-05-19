import shutil


def source_runner():
    input_folder = './input/passthrough_data'
    alt_input_folder = './input/passthrough'
    output_folder = './data'

    # clear existing output folder contents
    shutil.rmtree(output_folder, ignore_errors=True)

    # copy the input/passthrough_data folder contents to the output folder
    shutil.copytree(input_folder, output_folder, dirs_exist_ok=True)
    shutil.copytree(alt_input_folder, output_folder, dirs_exist_ok=True)
