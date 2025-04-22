import json


def merge_json_array_files(
    json_files: list[str], output_file: str, indent: int = 2, object_merge_keys: list[str] = ['GEOID', 'YEAR']
) -> None:
    """
    Merge multiple JSON array files into a single JSON array file.
    The merged file will contain all objects from the input files,
    with objects that share the same values of the merge keys
    combined.

    Args:
        json_files (list[str]): List of paths to the input JSON array files.
        output_file (str): Path to the output merged JSON array file.
        indent (int): Indentation level for the output JSON file. Default is 2.
        object_merge_keys (list[str]): List of keys to identify objects to combine. Default is ['GEOID', 'YEAR'].
    """
    merged_data = {}

    # Read each JSON file and merge the data
    for json_file in json_files:

        # open the json file and load the data
        with open(json_file, 'r') as file:
            data = json.load(file)

            # iterate through each object in the JSON array
            for obj in data:
                # create a unique key for the object based on the merge keys
                merge_key = tuple(obj[key] for key in object_merge_keys)

                # if a matching object is not found, add the object to the merged data
                if merge_key not in merged_data:
                    merged_data[merge_key] = obj

                # otherwise, add the object's data to the existing object
                else:
                    for key, value in obj.items():
                        # warning: this will overwrite existing values
                        # if the key already exists in the merged object
                        merged_data[merge_key][key] = value

    # write the merged data to the output file
    with open(output_file, 'w') as file:
        json.dump(list(merged_data.values()), file,
                  sort_keys=True, indent=indent)
