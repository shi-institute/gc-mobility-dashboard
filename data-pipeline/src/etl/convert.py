import pandas


def convert_string_columns_to_numeric(df: pandas.DataFrame) -> pandas.DataFrame:
    """
    Converts string columns with numbers to int or float in a Pandas DataFrame.
    Prefers int unless the column contains float values.
    """
    for column in df.columns:
        if df[column].dtype == "object":
            try:
                # attempt to convert to numeric (int64 or float64)
                numeric_series = pandas.to_numeric(df[column], errors="raise")

                # check if the series contains any float values
                if (numeric_series % 1 == 0).all():
                    # convert to int if all values are integers
                    df[column] = numeric_series.astype(int)
                else:
                    # otherwise, convert to float
                    df[column] = numeric_series.astype(float)
            except ValueError:
                # if conversion fails, leave the column as is
                pass
    return df
