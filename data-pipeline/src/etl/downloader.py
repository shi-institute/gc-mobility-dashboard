import os
import shutil
import zipfile
from typing import Mapping, Self

import requests


class Downloader:
    file_url: str
    download_file_name: str

    def __init__(self, file_url: str, download_file_name: str):
        """
        Initialize the Downloader with a file URL and a download file name.

        Args:
            file_url (str): The URL of the file to download.
            download_file_name (str): The name of the file to save the downloaded content as.
        """
        self.file_url = file_url
        self.download_file_name = download_file_name

    def download(self, verify: bool = True, replace: bool = True, *, headers: Mapping[str, str | bytes | None] | None = None, raise_on_request_error: bool = False) -> Self:
        """
        Download a file from a URL and save it to a specified location.

        Args:
            file_url (str): The URL of the file to download.
            download_file_name (str): The name of the file to save the downloaded content as.
            verify (bool): Whether to verify the SSL certificate. Defaults to True.
            replace (bool): Whether to replace the existing file. Defaults to True.
            headers (Mapping[str, str | bytes | None] | None): Optional headers to include in the request.
            raise_on_request_error (bool): Whether to raise an exception on request errors. Defaults to False.
        """

        # if the file already exists and replace is False, do not re-download
        if os.path.exists(self.download_file_name) and not replace:
            print(f"{self.download_file_name} already exists. Skipping download.")
            return self

        # create the destination directory if it doesn't exist
        os.makedirs(os.path.dirname(self.download_file_name), exist_ok=True)

        # delete the file/folder if it already exists
        if os.path.exists(self.download_file_name):
            if os.path.isfile(self.download_file_name):
                os.remove(self.download_file_name)
            else:
                shutil.rmtree(self.download_file_name)

        try:
            response = requests.get(
                self.file_url, verify=verify, headers=headers)
            response.raise_for_status()  # Raise an error for bad responses
            with open(self.download_file_name, 'wb') as file:
                file.write(response.content)
            print(
                f"Downloaded {self.file_url} and saved as {self.download_file_name}")
        except requests.exceptions.RequestException as e:
            print(f"Error downloading {self.file_url}: {e}")
            if raise_on_request_error:
                raise e

        return self

    def unzip(self) -> Self:
        """
        Unzip the downloaded file.
        """

        # rename the zipped file so that the unzipped file can be stored to the
        # exact same location
        temporary_zip_file_name = self.download_file_name + '.temp.zip'
        os.rename(self.download_file_name, temporary_zip_file_name)

        # extract the contents of the zip file
        try:
            with zipfile.ZipFile(temporary_zip_file_name, 'r') as zip_ref:
                zip_ref.extractall(self.download_file_name)
            print(f"Unzipped {self.download_file_name}")
        except zipfile.BadZipFile as e:
            print(f"Error unzipping {self.download_file_name}: {e}")

        # delete the zipped version
        os.remove(temporary_zip_file_name)

        return self
