# Module: checksum.py

# ------------------------------------------------------------------------------------------------ #
# Calculate Checksum 
# ------------------------------------------------------------------------------------------------ #
def calculate_checksum(policy_number):
    """Calculate the checksum for a given policy number."""
    # Convert each character to an integer (ignore "?")
    digits = [int(d) for d in policy_number if d.isdigit()]
    total = sum(digit * (i + 1) for i, digit in enumerate(digits))
    return total % 11 == 0

# ------------------------------------------------------------------------------------------------ #
# Read the policy numbers from policy_numbers_silver.txt
# ------------------------------------------------------------------------------------------------ #
def read_policy_numbers(file_path):
    """Reads policy numbers from a given file."""
    with open(file_path, 'r') as file:
        return [line.strip() for line in file]

# ------------------------------------------------------------------------------------------------ #
# Write the corrected policy numbers to policy_numbers_gold.txt
# ------------------------------------------------------------------------------------------------ #
def write_policy_numbers(file_path, policy_numbers):
    with open(file_path, 'w') as file:
        for policy_number in policy_numbers:
            file.write(policy_number + '\n')
