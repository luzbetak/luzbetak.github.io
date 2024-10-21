#!/usr/bin/env python

from checksum import calculate_checksum

# ------------------------------------------------------------------------------------------------ #
# Define ASCII-to-digit mappings for numbers 0-9
# ------------------------------------------------------------------------------------------------ #
ascii_to_digit = {
    (" _ ", "| |", "|_|"): "0",
    ("   ", "  |", "  |"): "1",
    (" _ ", " _|", "|_ "): "2",
    (" _ ", " _|", " _|"): "3",
    ("   ", "|_|", "  |"): "4",
    (" _ ", "|_ ", " _|"): "5",
    (" _ ", "|_ ", "|_|"): "6",
    (" _ ", "  |", "  |"): "7",
    (" _ ", "|_|", "|_|"): "8",
    (" _ ", "|_|", " _|"): "9",
}

# ------------------------------------------------------------------------------------------------ #
def parse_ascii_ascii_numbers(file_path):
    """Reads the ASCII representation of all ascii numbers from the file."""
    with open(file_path, "r") as f:
        lines = [line.rstrip("\n") for line in f]

    ascii_numbers = []

    # Process the file in blocks of 4 lines (3 lines of digits + 1 blank line)
    for i in range(0, len(lines), 4):
        entry = lines[i:i + 3]  # Extract the 3 lines representing a ascii number

        # Check if the entry has the expected 3 lines
        if len(entry) < 3:
            print(f"Skipping incomplete entry at lines {i}-{i+3}.")
            continue

        digits = []
        contains_unrecognized = False  # Track if there's a "?" digit

        # Extract each 3-character block for all 9 digits
        for j in range(0, 27, 3):
            digit_tuple = (entry[0][j:j+3], entry[1][j:j+3], entry[2][j:j+3])
            digit = ascii_to_digit.get(digit_tuple, "?")

            # --- Unrecognized digit === #
            if digit == "?":
                contains_unrecognized = True  # Mark as containing invalid digits
            digits.append(digit)

        ascii_numbers.append(("".join(digits), contains_unrecognized))

    return ascii_numbers

# ------------------------------------------------------------------------------------------------ #
if __name__ == "__main__":
    file_path = "ascii_numbers_bronze.txt"
    parsed_ascii_numbers = parse_ascii_ascii_numbers(file_path)

    with open("ascii_numbers_silver.txt", "w") as output_file:
        # Print and write ascii numbers based on checksum and unrecognized digits
        for ascii_number, contains_unrecognized in parsed_ascii_numbers:
            if contains_unrecognized:
                output = f"{ascii_number} ILL"
            elif calculate_checksum(ascii_number):
                output = ascii_number
            else:
                output = f"{ascii_number} ERR"

            print(output)
            output_file.write(output + "\n")
