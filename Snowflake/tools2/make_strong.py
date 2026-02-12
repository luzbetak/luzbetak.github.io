#!/usr/bin/env python3

import sys
import re

def make_strong(filename, word):
    """
    Replace all occurrences of a word with <strong>word</strong> in a file.
    Overwrites the original file.
    
    Args:
        filename: Path to the file to modify
        word: Word to wrap with <strong> tags
    """
    try:
        # Read the file content
        with open(filename, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace whole word occurrences only
        # \b ensures word boundaries (won't match partial words)
        pattern = r'\b' + re.escape(word) + r'\b'
        replacement = f'<strong>{word}</strong>'
        modified_content = re.sub(pattern, replacement, content)
        
        # Write back to the same file (overwrite)
        with open(filename, 'w', encoding='utf-8') as file:
            file.write(modified_content)
        
        # Count replacements made
        count = len(re.findall(pattern, content))
        print(f"✓ Replaced {count} occurrences of '{word}' with '<strong>{word}</strong>' in {filename}")
        
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def make_strong_multiple(filename, *words):
    """
    Replace multiple words with <strong> tags in a single pass.
    
    Args:
        filename: Path to the file to modify
        words: Multiple words to wrap with <strong> tags
    """
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            content = file.read()
        
        modified_content = content
        total_count = 0
        
        for word in words:
            pattern = r'\b' + re.escape(word) + r'\b'
            replacement = f'<strong>{word}</strong>'
            count = len(re.findall(pattern, modified_content))
            modified_content = re.sub(pattern, replacement, modified_content)
            total_count += count
            if count > 0:
                print(f"  ✓ Replaced {count} occurrences of '{word}'")
        
        with open(filename, 'w', encoding='utf-8') as file:
            file.write(modified_content)
        
        print(f"✓ Total: {total_count} replacements made in {filename}")
        
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def make_strong_case_insensitive(filename, word):
    """
    Replace all occurrences of a word (case-insensitive) with <strong> tags.
    Preserves the original case of the word.
    
    Args:
        filename: Path to the file to modify
        word: Word to wrap with <strong> tags
    """
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Case-insensitive pattern that preserves original case
        pattern = r'\b(' + re.escape(word) + r')\b'
        replacement = r'<strong>\1</strong>'
        modified_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
        
        with open(filename, 'w', encoding='utf-8') as file:
            file.write(modified_content)
        
        count = len(re.findall(pattern, content, re.IGNORECASE))
        print(f"✓ Replaced {count} occurrences (case-insensitive) of '{word}' in {filename}")
        
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python make_strong.py <filename> <word> [word2] [word3] ...")
        print("Example: python make_strong.py temp.txt PERMANENT")
        print("Example: python make_strong.py temp.txt PERMANENT TEMPORARY TRANSIENT")
        sys.exit(1)
    
    filename = sys.argv[1]
    words = sys.argv[2:]
    
    if len(words) == 1:
        make_strong(filename, words[0])
    else:
        make_strong_multiple(filename, *words)
