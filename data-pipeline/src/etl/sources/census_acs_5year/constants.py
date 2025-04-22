from typing import List, Literal, Optional, Tuple, TypedDict

CensusDataTableName = Literal['S0101', 'DP05', 'S1501', 'B08201']
CensusTableColumns = List[Tuple[str, str]]


class CensusDataTableInfo(TypedDict):
    label: str
    years: list[int]
    data: str
    metadata: str
    variables: str
    columns: Optional[CensusTableColumns]


tables: dict[CensusDataTableName, CensusDataTableInfo] = {
    'S0101': {
        'label': 'Age and Sex',
        'years': [2019, 2020, 2021, 2022, 2023],
        'data': "https://api.census.gov/data/{year}/acs/acs5/subject?get=group(S0101)&ucgid=pseudo(0500000US45045$1400000)",
        'metadata': 'https://api.census.gov/data/{year}/acs/acs5/subject',
        'variables': 'https://api.census.gov/data/{year}/acs/acs5/subject/variables',
        'columns': [
            ('S0101_C01_001E', 'population__total')
        ]
    },
    'DP05': {
        'label': 'ACS Demographic and Housing Estimates',
        'years': [2019, 2020, 2021, 2022, 2023],
        'data': 'https://api.census.gov/data/{year}/acs/acs5/profile?get=group(DP05)&ucgid=pseudo(0500000US45045$1400000)',
        'metadata': 'https://api.census.gov/data/{year}/acs/acs5/profile',
        'variables': 'https://api.census.gov/data/{year}/acs/acs5/profile/variables',
        'columns': [
            ('DP05_0077E', 'race_ethnicity__white_alone'),
            ('DP05_0078E', 'race_ethnicity__black_alone'),
            ('DP05_0079E', 'race_ethnicity__native_alone'),
            ('DP05_0080E', 'race_ethnicity__asian_alone'),
            ('DP05_0081E', 'race_ethnicity__pacific_islander_alone'),
            ('DP05_0082E', 'race_ethnicity__other_alone'),
            ('DP05_0083E', 'race_ethnicity__multiple'),
            ('DP05_0071E', 'race_ethnicity__hispanic'),
        ]
    },
    'S1501': {
        'label': 'Educational Attainment',
        'years': [2019, 2020, 2021, 2022, 2023],
        'data': 'https://api.census.gov/data/{year}/acs/acs5/subject?get=group(S1501)&ucgid=pseudo(0500000US45045$1400000)',
        'metadata': 'https://api.census.gov/data/{year}/acs/acs5/subject',
        'variables': 'https://api.census.gov/data/{year}/acs/acs5/subject/variables',
        'columns': [
            ('S1501_C01_007E', 'educational_attainment__no_high_school'),
            ('S1501_C01_008E', 'educational_attainment__some_high_school'),
            ('S1501_C01_009E', 'educational_attainment__high_school_graduate_or_equivalent'),
            ('S1501_C01_010E', 'educational_attainment__some_college'),
            ('S1501_C01_011E', 'educational_attainment__associate_degree'),
            ('S1501_C01_012E', 'educational_attainment__bachelor_degree'),
            ('S1501_C01_013E', 'educational_attainment__graduate_or_professional_degree'),
        ]
    },
    'B08201': {
        'label': 'Household Size by Vehicles Available',
        'years': [2019, 2020, 2021, 2022, 2023],
        'data': 'https://api.census.gov/data/{year}/acs/acs5?get=group(B08201)&ucgid=pseudo(0500000US45045$1400000)',
        'metadata': 'https://api.census.gov/data/{year}/acs/acs5',
        'variables': 'https://api.census.gov/data/{year}/acs/acs5/variables',
        'columns': [
            ('B08201_001E', 'households__total'),
            ('B08201_002E', 'households__no_vehicle'),
            ('B08201_003E', 'households__1_vehicle'),
            ('B08201_004E', 'households__2_vehicles'),
            ('B08201_005E', 'households__3_vehicles'),
            ('B08201_006E', 'households__4_plus_vehicles'),
        ]
    }
}
