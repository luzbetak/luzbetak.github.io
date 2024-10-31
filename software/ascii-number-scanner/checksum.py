# Module: checksum.py

# ------------------------------------------------------------------------------------------------ #
# Calculate Checksum 
# ------------------------------------------------------------------------------------------------ #
def calculate_checksum(ascii_number):
    """Calculate the checksum for a given ascii number."""
    # Convert each character to an integer (ignore "?")
    digits = [int(d) for d in ascii_number if d.isdigit()]
    total = sum(digit * (i + 1) for i, digit in enumerate(digits))
    return total % 11 == 0

# ------------------------------------------------------------------------------------------------ #
# Read the ascii numbers from ascii_numbers_silver.txt
# ------------------------------------------------------------------------------------------------ #
def read_ascii_numbers(file_path):
    """Reads ascii numbers from a given file."""
    with open(file_path, 'r') as file:
        return [line.strip() for line in file]

# ------------------------------------------------------------------------------------------------ #
# Write the corrected ascii numbers to ascii_numbers_gold.txt
# ------------------------------------------------------------------------------------------------ #
def write_ascii_numbers(file_path, ascii_numbers):
    with open(file_path, 'w') as file:
        for ascii_number in ascii_numbers:
            file.write(ascii_number + '\n')
