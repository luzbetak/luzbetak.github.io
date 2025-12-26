#!/usr/bin/env python

import pandas as pd
import pprint

# Read the CSV file
input_file = "input.csv"
df = pd.read_csv(input_file)

# Convert the DataFrame to JSON format and save it to a file
output_file = "output.json"
df.to_json(output_file, orient='records', lines=False)

pprint.pprint(df)

