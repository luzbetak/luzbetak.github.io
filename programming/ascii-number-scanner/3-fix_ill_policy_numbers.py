#!/usr/bin/env python
import re
from checksum import calculate_checksum, read_ascii_numbers, write_ascii_numbers

# ------------------------------------------------------------------------------------------------ #
# Function to fix a ascii number marked as ILL by attempting possible corrections
# ------------------------------------------------------------------------------------------------ #
def fix_ascii_number_ill():
    input_file  = 'ascii_numbers_silver.txt'
    output_file = 'ascii_numbers_gold.txt'

    ascii_numbers = read_ascii_numbers(input_file)
    corrected_policies = []

    for ascii in ascii_numbers:
        if ascii.endswith("ILL"):
            ascii = ascii[:-4].strip()  # Remove the ' ILL'
            question_indices = [i for i, char in enumerate(ascii) if char == '?']

            # Ignore to fix if more than one '?' is present in the ascii number
            if len(question_indices) > 1:
                corrected_policies.append(ascii)
                continue

            for replacement in range(10 ** len(question_indices)):
                replacement_str = str(replacement).zfill(len(question_indices))
                new_ascii = list(ascii)
                for idx, char in zip(question_indices, replacement_str):
                    new_ascii[idx] = char
                new_ascii_str = "".join(new_ascii)
                if calculate_checksum(new_ascii_str):
                    corrected_policies.append(new_ascii_str + " ILL FIX")
                    break
            else:
                corrected_policies.append(ascii)  # No valid fix found
        else:
            corrected_policies.append(ascii)  # Valid ascii number, keep it

    write_ascii_numbers(output_file, corrected_policies)

# ------------------------------------------------------------------------------------------------ #
# Function to fix a ascii number marked as ERR by attempting possible corrections
# ------------------------------------------------------------------------------------------------ #
def fix_ascii_number_err():
    input_file  = 'ascii_numbers_gold.txt'
    output_file = 'ascii_numbers_platinum.txt'

    ascii_numbers = read_ascii_numbers(input_file)
    corrected_policies = []

    corrections = {
        '9': ['8'],
        '0': ['8'],
        '1': ['7'],
        '5': ['9', '6']
    }

    for ascii in ascii_numbers:
        if ascii.endswith("ERR"):
            ascii = ascii[:-4].strip()  # Remove the ' ERR'
            # Iterate over each character in the ascii number
            for i, char in enumerate(ascii):
                if char in corrections:
                    for replacement in corrections[char]:
                        new_ascii = list(ascii)
                        new_ascii[i] = replacement
                        new_ascii_str = "".join(new_ascii)
                        if calculate_checksum(new_ascii_str):
                            corrected_policies.append(new_ascii_str + " ERR FIX")
                            break
                    else:
                        continue
                    break
            else:
                corrected_policies.append(ascii + " ERR")  # No valid fix found
        else:
            corrected_policies.append(ascii)  # Valid ascii number, keep it

    write_ascii_numbers(output_file, corrected_policies)

# ------------------------------------------------------------------------------------------------ #
def main():
    fix_ascii_number_ill()
    fix_ascii_number_err()

# ------------------------------------------------------------------------------------------------ #
if __name__ == "__main__":
    main()

