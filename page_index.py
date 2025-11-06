#!/usr/bin/env python3

import os
import json
import re
import logging
from pathlib import Path
from typing import Set, List, Dict, Optional
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import argparse
import fnmatch

from bs4 import BeautifulSoup
import spacy
from spacy.language import Language
import nltk
from nltk.corpus import stopwords

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Hard-coded excluded directory patterns (excluding output directory pattern)
EXCLUDED_DIRS = ['*includes', 'custom*dir', 'animation', 'images', 'search', 'autoReply']

@dataclass
class IndexEntry:
    """Data class for search index entries"""
    id: int
    title: str
    content: str
    url: str

class SearchIndexGenerator:
    def __init__(self, output_dir: str = "search"):
        """Initialize the search index generator with necessary NLP components"""
        # Ensure output_dir is an absolute Path
        self.output_dir = Path(output_dir).resolve()
        self.nlp = self._initialize_spacy()
        self.stop_words = self._initialize_nltk()
        logger.info(f"Output directory set to: {self.output_dir}")

    def _initialize_spacy(self) -> Language:
        """Initialize spaCy with error handling"""
        try:
            return spacy.load("en_core_web_sm")
        except OSError:
            logger.error("SpaCy model 'en_core_web_sm' not found")
            self._install_spacy_model()
            return spacy.load("en_core_web_sm")

    def _initialize_nltk(self) -> Set[str]:
        """Initialize NLTK components"""
        try:
            nltk.download('stopwords', quiet=True)
            return set(stopwords.words('english'))
        except Exception as e:
            logger.error(f"Error initializing NLTK: {e}")
            raise

    def _install_spacy_model(self) -> None:
        """Install the required spaCy model"""
        logger.info("Installing spaCy model...")
        os.system("python -m spacy download en_core_web_sm")

    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        text = re.sub(r'-+', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        text = text.replace('#!/usr/bin/env', ' ')
        return text.strip()

    @staticmethod
    def clean_title(title: str) -> str:
        """Clean and normalize title"""
        title = re.sub(r'[-_]', ' ', title)
        title = title.replace('.html', '')
        return title.strip()

    def extract_technical_terms(self, text: str) -> Set[str]:
        """Extract technical terms using spaCy NLP"""
        doc = self.nlp(text)
        technical_terms = set()

        # Extract named entities
        for ent in doc.ents:
            if ent.label_ in {'ORG', 'PRODUCT', 'GPE', 'NORP', 'FAC', 'EVENT', 'WORK_OF_ART'}:
                technical_terms.add(ent.text.lower())

        # Extract noun chunks and filter out stopwords
        for chunk in doc.noun_chunks:
            if not all(token.text.lower() in self.stop_words for token in chunk):
                technical_terms.add(chunk.text.lower())

        return technical_terms

    def should_exclude_path(self, path: Path) -> bool:
        """Check if the path should be excluded based on wildcard patterns"""
        # First check if the path is in or under the output directory
        if self.output_dir in path.parents or path == self.output_dir:
            return True
            
        # Then check against the excluded patterns
        return any(
            any(fnmatch.fnmatch(part, pattern) for part in path.parts)
            for pattern in EXCLUDED_DIRS
        )

    def process_html_file(self, file_path: Path, file_id: int) -> Optional[IndexEntry]:
        """Process a single HTML file and return an index entry"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f, 'html.parser')

                # Extract and clean text
                body_text = soup.get_text(separator=' ', strip=True)
                clean_body_text = self.clean_text(body_text)

                # Extract technical terms
                technical_terms = self.extract_technical_terms(clean_body_text)

                # Create URL path
                url_path = f"/{str(file_path.relative_to(Path.cwd()))}"

                return IndexEntry(
                    id=file_id,
                    title=file_path.name,
                    content=" ".join(sorted(technical_terms)),
                    url=url_path
                )

        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            return None

    def generate_index(self) -> None:
        """Generate the search index from HTML files"""
        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Ensuring output directory exists: {self.output_dir}")

        # Collect HTML files, excluding specified directories
        html_files = [
            p for p in Path.cwd().rglob("*.html")
            if p.name != "index.html" and not self.should_exclude_path(p)
        ]

        logger.info(f"Found {len(html_files)} HTML files to process")

        if not html_files:
            logger.warning("No HTML files found to process")
            return

        # Process files in parallel
        with ThreadPoolExecutor() as executor:
            entries = list(filter(None, executor.map(
                lambda x: self.process_html_file(x[1], x[0]),
                enumerate(html_files, 1)
            )))

        logger.info(f"Successfully processed {len(entries)} files")

        # Post-process entries
        self._post_process_entries(entries)

        # Write index file
        self._write_index_file(entries)

    def _post_process_entries(self, entries: List[IndexEntry]) -> None:
        """Post-process entries to ensure unique content and clean titles"""
        for entry in entries:
            # Clean title
            cleaned_title = self.clean_title(entry.title)

            # Split content into words and filter
            words = entry.content.split()
            filtered_words = [
                word.lower() for word in words
                if word.isalpha() and word.lower() not in self.stop_words
            ]

            # Remove duplicates and combine with cleaned title
            unique_words = sorted(set(filtered_words))
            entry.content = f"{cleaned_title.lower()} {' '.join(unique_words)}"

    def _write_index_file(self, entries: List[IndexEntry]) -> None:
        """Write the search index to a JSON file"""
        output_file = self.output_dir / "search-index.json"

        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(
                    [vars(entry) for entry in entries],
                    f,
                    indent=2,
                    ensure_ascii=False
                )
            logger.info(f"Successfully created search index at: {output_file}")

        except Exception as e:
            logger.error(f"Error writing index file: {e}")
            raise

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Generate search index from HTML files")
    parser.add_argument(
        "--output-dir",
        default="search",
        help="Output directory for search index (default: search)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging"
    )

    args = parser.parse_args()

    if args.debug:
        logger.setLevel(logging.DEBUG)

    try:
        generator = SearchIndexGenerator(args.output_dir)
        generator.generate_index()
    except Exception as e:
        logger.error(f"Failed to generate search index: {e}")
        exit(1)

if __name__ == "__main__":
    main()
