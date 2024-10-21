#!/usr/bin/env python

import random
import sys
import pprint

# ------------------------------------------------------------------------------------------------ #
# ASCII patterns for numbers 0-9
# ------------------------------------------------------------------------------------------------ #
digit_to_ascii = {
    "0": (" _ ", "| |", "|_|"),
    "1": ("   ", "  |", "  |"),
    "2": (" _ ", " _|", "|_ "),
    "3": (" _ ", " _|", " _|"),
    "4": ("   ", "|_|", "  |"),
    "5": (" _ ", "|_ ", " _|"),
    "6": (" _ ", "|_ ", "|_|"),
    "7": (" _ ", "  |", "  |"),
    "8": (" _ ", "|_|", "|_|"),
    "9": (" _ ", "|_|", " _|"),
}

# ------------------------------------------------------------------------------------------------ #
# Create a reverse mapping from ASCII tuples to digits
# ------------------------------------------------------------------------------------------------ #
ascii_to_digit = {v: k for k, v in digit_to_ascii.items()}
# pprint.pprint(ascii_to_digit, width=40)

# ------------------------------------------------------------------------------------------------ #
def generate_random_policy_number():
    """Generates a random 9-digit policy number."""
    return " ".join(str(random.randint(0, 9)) for _ in range(9))

# ------------------------------------------------------------------------------------------------ #
def write_policy_number(policy_number, file_path, append=False):
    """Writes the ASCII representation of a policy number to a file."""
    lines = ["", "", ""]

    # Convert each digit into ASCII format and append to lines
    for digit in policy_number.split():
        ascii_digit = digit_to_ascii[digit]
        for i in range(3):
            # Mock: Introduce a 1% failure and write an invalid character
            if random.random() < 0.01:
                lines[i] += "???"  # Invalid character block
            else:
                lines[i] += ascii_digit[i]

    # Join the lines and add a blank line after each policy entry
    ascii_output = "\n".join(lines) + "\n\n"

    # Open the file in append or write mode
    mode = "a" if append else "w"
    with open(file_path, mode) as f:
        f.write(ascii_output)

# ------------------------------------------------------------------------------------------------ #
def main(num_policies=5):
    """Generates and writes multiple policy numbers to the file."""
    file_path = "policy_numbers_bronze.txt"

    # Generate and write the specified number of policy numbers
    for i in range(num_policies):
        policy_number = generate_random_policy_number()
        write_policy_number(policy_number, file_path, append=(i > 0))

    print(f"Wrote {num_policies} policy numbers to {file_path}")

# ------------------------------------------------------------------------------------------------ #
if __name__ == "__main__":
    num_policies = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    main(num_policies)

