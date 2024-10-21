#!/usr/bin/env python
import re
from checksum import calculate_checksum, read_policy_numbers, write_policy_numbers

# ------------------------------------------------------------------------------------------------ #
# Function to fix a policy number marked as ILL by attempting possible corrections
# ------------------------------------------------------------------------------------------------ #
def fix_policy_number_ill():
    input_file  = 'policy_numbers_silver.txt'
    output_file = 'policy_numbers_gold.txt'

    policy_numbers = read_policy_numbers(input_file)
    corrected_policies = []

    for policy in policy_numbers:
        if policy.endswith("ILL"):
            policy = policy[:-4].strip()  # Remove the ' ILL'
            question_indices = [i for i, char in enumerate(policy) if char == '?']

            # Ignore to fix if more than one '?' is present in the policy number
            if len(question_indices) > 1:
                corrected_policies.append(policy)
                continue

            for replacement in range(10 ** len(question_indices)):
                replacement_str = str(replacement).zfill(len(question_indices))
                new_policy = list(policy)
                for idx, char in zip(question_indices, replacement_str):
                    new_policy[idx] = char
                new_policy_str = "".join(new_policy)
                if calculate_checksum(new_policy_str):
                    corrected_policies.append(new_policy_str + " ILL FIX")
                    break
            else:
                corrected_policies.append(policy)  # No valid fix found
        else:
            corrected_policies.append(policy)  # Valid policy number, keep it

    write_policy_numbers(output_file, corrected_policies)

# ------------------------------------------------------------------------------------------------ #
# Function to fix a policy number marked as ERR by attempting possible corrections
# ------------------------------------------------------------------------------------------------ #
def fix_policy_number_err():
    input_file  = 'policy_numbers_gold.txt'
    output_file = 'policy_numbers_platinum.txt'

    policy_numbers = read_policy_numbers(input_file)
    corrected_policies = []

    corrections = {
        '9': ['8'],
        '0': ['8'],
        '1': ['7'],
        '5': ['9', '6']
    }

    for policy in policy_numbers:
        if policy.endswith("ERR"):
            policy = policy[:-4].strip()  # Remove the ' ERR'
            # Iterate over each character in the policy number
            for i, char in enumerate(policy):
                if char in corrections:
                    for replacement in corrections[char]:
                        new_policy = list(policy)
                        new_policy[i] = replacement
                        new_policy_str = "".join(new_policy)
                        if calculate_checksum(new_policy_str):
                            corrected_policies.append(new_policy_str + " ERR FIX")
                            break
                    else:
                        continue
                    break
            else:
                corrected_policies.append(policy + " ERR")  # No valid fix found
        else:
            corrected_policies.append(policy)  # Valid policy number, keep it

    write_policy_numbers(output_file, corrected_policies)

# ------------------------------------------------------------------------------------------------ #
def main():
    fix_policy_number_ill()
    fix_policy_number_err()

# ------------------------------------------------------------------------------------------------ #
if __name__ == "__main__":
    main()

