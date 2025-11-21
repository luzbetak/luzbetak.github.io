#!/usr/bin/env python3
"""
text_nn_demo.py

Educational demo: tiny neural network that learns from sentences (sentiment).

What it does
------------
- Has a small labeled dataset of sentences: positive (1) vs negative (0).
- Builds a simple word-level vocabulary.
- Converts each sentence to a bag-of-words vector.
- Trains a 2-layer neural network:
    input (vocab_size) -> hidden (8, ReLU) -> output (1, sigmoid)
- Prints training loss and tests on a few new sentences.

Dependencies
------------
- Python 3.x
- NumPy

Run
---
    python text_nn_demo.py
"""

import numpy as np
import re
from typing import List, Dict, Tuple


# -----------------------
# Toy text dataset
# -----------------------

def get_toy_sentiment_data() -> Tuple[List[str], np.ndarray]:
    """
    Returns:
        sentences: list of sentences (str)
        labels: numpy array of shape (N, 1), 1 = positive, 0 = negative
    """
    positive_sentences = [
        "I love this movie",
        "This is a great product",
        "What a fantastic experience",
        "I am very happy today",
        "The food was amazing",
        "I really enjoyed this",
        "This is absolutely wonderful",
    ]

    negative_sentences = [
        "I hate this movie",
        "This is a terrible product",
        "What a bad experience",
        "I am very sad today",
        "The food was awful",
        "I really disliked this",
        "This is absolutely horrible",
    ]

    sentences = positive_sentences + negative_sentences
    labels = np.array(
        [1] * len(positive_sentences) + [0] * len(negative_sentences),
        dtype=np.float32
    ).reshape(-1, 1)

    return sentences, labels


# -----------------------
# Text preprocessing
# -----------------------

def tokenize(text: str) -> List[str]:
    """
    Very simple tokenizer:
    - Lowercase
    - Remove non-letter characters except spaces
    - Split on whitespace
    """
    text = text.lower()
    text = re.sub(r"[^a-z\s]", "", text)  # keep letters and spaces
    tokens = text.split()
    return tokens


def build_vocab(sentences: List[str], min_freq: int = 1) -> Dict[str, int]:
    """
    Builds a word -> index vocabulary from the list of sentences.

    min_freq: minimum word frequency to keep in the vocab
    """
    freq = {}
    for s in sentences:
        for tok in tokenize(s):
            freq[tok] = freq.get(tok, 0) + 1

    # Reserve index 0 for unknown tokens (UNK)
    word2idx = {"<UNK>": 0}
    idx = 1
    for word, count in sorted(freq.items()):
        if count >= min_freq:
            word2idx[word] = idx
            idx += 1

    return word2idx


def sentence_to_bow(sentence: str, word2idx: Dict[str, int]) -> np.ndarray:
    """
    Convert a sentence into a bag-of-words vector of shape (vocab_size,).

    - Bag-of-words: counts how many times each word appears (order is ignored).
    """
    tokens = tokenize(sentence)
    vec = np.zeros(len(word2idx), dtype=np.float32)

    for tok in tokens:
        idx = word2idx.get(tok, 0)  # 0 is <UNK>
        vec[idx] += 1.0

    return vec


def vectorize_sentences(sentences: List[str], word2idx: Dict[str, int]) -> np.ndarray:
    """
    Convert a list of sentences into a matrix X of shape (N, vocab_size).
    """
    X = np.stack([sentence_to_bow(s, word2idx) for s in sentences], axis=0)
    return X


# -----------------------
# Simple neural network
# -----------------------

class SimpleNeuralNet:
    """
    Small fully-connected neural network:

        input_dim -> hidden_dim (ReLU) -> 1 (sigmoid)

    Implemented from scratch with NumPy for educational purposes.
    """

    def __init__(self, input_dim: int, hidden_dim: int = 8, seed: int = 0):
        rng = np.random.default_rng(seed)

        # Xavier-like initialization (scaled)
        self.W1 = rng.normal(0.0, 1.0, size=(input_dim, hidden_dim)) * np.sqrt(2 / input_dim)
        self.b1 = np.zeros((1, hidden_dim), dtype=np.float32)

        self.W2 = rng.normal(0.0, 1.0, size=(hidden_dim, 1)) * np.sqrt(2 / hidden_dim)
        self.b2 = np.zeros((1, 1), dtype=np.float32)

    @staticmethod
    def _relu(z):
        return np.maximum(0, z)

    @staticmethod
    def _relu_grad(z):
        return (z > 0).astype(z.dtype)

    @staticmethod
    def _sigmoid(z):
        return 1.0 / (1.0 + np.exp(-z))

    def forward(self, X: np.ndarray):
        """
        Forward pass. Returns:
        - y_hat: predicted probabilities, shape (N, 1)
        - cache: intermediate values for backprop
        """
        z1 = X @ self.W1 + self.b1      # (N, hidden_dim)
        a1 = self._relu(z1)
        z2 = a1 @ self.W2 + self.b2     # (N, 1)
        y_hat = self._sigmoid(z2)

        cache = {"X": X, "z1": z1, "a1": a1, "z2": z2, "y_hat": y_hat}
        return y_hat, cache

    @staticmethod
    def binary_cross_entropy(y_true: np.ndarray, y_pred: np.ndarray, eps: float = 1e-8) -> float:
        """
        Binary cross-entropy loss.

        y_true: shape (N, 1), values 0 or 1
        y_pred: shape (N, 1), values in (0, 1)
        """
        y_pred = np.clip(y_pred, eps, 1 - eps)
        loss = -np.mean(
            y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred)
        )
        return float(loss)

    def backward(self, cache, y_true: np.ndarray):
        """
        Backpropagation to compute gradients.
        Returns a dict: dW1, db1, dW2, db2
        """
        X = cache["X"]
        z1 = cache["z1"]
        a1 = cache["a1"]
        y_hat = cache["y_hat"]

        N = X.shape[0]

        # dL/dz2 for sigmoid + BCE
        dz2 = (y_hat - y_true) / N      # (N, 1)

        dW2 = a1.T @ dz2                # (hidden_dim, 1)
        db2 = np.sum(dz2, axis=0, keepdims=True)

        da1 = dz2 @ self.W2.T           # (N, hidden_dim)
        dz1 = da1 * self._relu_grad(z1)
        dW1 = X.T @ dz1                 # (input_dim, hidden_dim)
        db1 = np.sum(dz1, axis=0, keepdims=True)

        return {"dW1": dW1, "db1": db1, "dW2": dW2, "db2": db2}

    def update_params(self, grads, lr: float = 0.1):
        """
        Gradient descent parameter update.
        """
        self.W1 -= lr * grads["dW1"]
        self.b1 -= lr * grads["db1"]
        self.W2 -= lr * grads["dW2"]
        self.b2 -= lr * grads["db2"]

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict probabilities for X.
        """
        y_hat, _ = self.forward(X)
        return y_hat

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        """
        Predict binary labels (0 or 1) for X.
        """
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)


# -----------------------
# Training demo
# -----------------------

def train_text_nn():
    # 1) Build dataset
    sentences, labels = get_toy_sentiment_data()
    word2idx = build_vocab(sentences, min_freq=1)
    X = vectorize_sentences(sentences, word2idx)  # (N, vocab_size)
    y = labels                                    # (N, 1)

    print(f"Number of sentences: {len(sentences)}")
    print(f"Vocabulary size: {len(word2idx)}")
    print(f"Example vocab items: {list(word2idx.items())[:10]}")
    print()

    # 2) Initialize neural network
    input_dim = X.shape[1]
    nn = SimpleNeuralNet(input_dim=input_dim, hidden_dim=8, seed=42)

    # 3) Train
    epochs = 1500
    lr = 0.1

    for epoch in range(1, epochs + 1):
        y_hat, cache = nn.forward(X)
        loss = nn.binary_cross_entropy(y, y_hat)
        grads = nn.backward(cache, y)
        nn.update_params(grads, lr)

        if epoch % 150 == 0 or epoch == 1:
            print(f"Epoch {epoch:4d}/{epochs}, loss = {loss:.4f}")

    # 4) Evaluate on training set
    y_pred = nn.predict(X)
    acc = np.mean(y_pred == y)
    print(f"\nTraining accuracy: {acc * 100:.2f}%")

    # 5) Try some new sentences
    test_sentences = [
        "I really love this",
        "This food is bad",
        "What a wonderful experience",
        "I am unhappy today",
        "This is terrible",
        "This is great",
    ]
    X_test = vectorize_sentences(test_sentences, word2idx)
    probs = nn.predict_proba(X_test)
    preds = (probs >= 0.5).astype(int)

    print("\nTest sentences:")
    for s, p, pr in zip(test_sentences, preds, probs):
        label = "positive" if p[0] == 1 else "negative"
        print(f"  '{s}' -> {label} (prob={pr[0]:.3f})")


if __name__ == "__main__":
    train_text_nn()

