#!/usr/bin/env python3
"""
simple_nn_demo.py

Educational demo: training a tiny neural network from scratch using NumPy.

What it does
------------
- Creates a 2D toy dataset (two Gaussian blobs, class 0 vs class 1).
- Defines a 2-layer neural network:
    input (2) -> hidden (8, ReLU) -> output (1, sigmoid)
- Trains it with binary cross-entropy loss + gradient descent.
- Prints training loss every few epochs and final accuracy.

Dependencies
------------
- Python 3.x
- NumPy

Run
---
    python simple_nn_demo.py
"""

import numpy as np


def make_toy_data(n_per_class: int = 200, seed: int = 0):
    """
    Create a simple 2D dataset: two Gaussian blobs.

    Class 0: centered near (-1, -1)
    Class 1: centered near ( 1,  1)
    """
    rng = np.random.default_rng(seed)

    mean0 = np.array([-1.0, -1.0])
    mean1 = np.array([1.0, 1.0])

    cov = np.array([[0.3, 0.0],
                    [0.0, 0.3]])

    X0 = rng.multivariate_normal(mean0, cov, size=n_per_class)
    X1 = rng.multivariate_normal(mean1, cov, size=n_per_class)

    X = np.vstack([X0, X1])             # shape: (2 * n_per_class, 2)
    y = np.concatenate([
        np.zeros(n_per_class),
        np.ones(n_per_class)
    ]).reshape(-1, 1)                   # shape: (2 * n_per_class, 1)

    # Shuffle dataset
    indices = rng.permutation(len(X))
    X = X[indices]
    y = y[indices]

    return X, y


class SimpleNeuralNet:
    """
    Very small fully-connected neural network:

        input_dim -> hidden_dim (ReLU) -> 1 (sigmoid)

    Implemented from scratch for educational purposes.
    """

    def __init__(self, input_dim: int, hidden_dim: int = 8, seed: int = 0):
        rng = np.random.default_rng(seed)

        # Xavier-like initialization (scaled)
        self.W1 = rng.normal(0.0, 1.0, size=(input_dim, hidden_dim)) * np.sqrt(2 / input_dim)
        self.b1 = np.zeros((1, hidden_dim))

        self.W2 = rng.normal(0.0, 1.0, size=(hidden_dim, 1)) * np.sqrt(2 / hidden_dim)
        self.b2 = np.zeros((1, 1))

    @staticmethod
    def _relu(z):
        return np.maximum(0, z)

    @staticmethod
    def _relu_grad(z):
        return (z > 0).astype(z.dtype)

    @staticmethod
    def _sigmoid(z):
        return 1.0 / (1.0 + np.exp(-z))

    def forward(self, X):
        """
        Forward pass. Returns:
        - y_hat: predicted probabilities
        - cache: intermediate values used for backprop
        """
        z1 = X @ self.W1 + self.b1      # shape: (N, hidden_dim)
        a1 = self._relu(z1)
        z2 = a1 @ self.W2 + self.b2     # shape: (N, 1)
        y_hat = self._sigmoid(z2)

        cache = {
            "X": X,
            "z1": z1,
            "a1": a1,
            "z2": z2,
            "y_hat": y_hat
        }
        return y_hat, cache

    @staticmethod
    def binary_cross_entropy(y_true, y_pred, eps: float = 1e-8):
        """
        Binary cross-entropy loss.

        y_true: shape (N, 1) with values 0 or 1
        y_pred: shape (N, 1) with values in (0, 1)
        """
        y_pred = np.clip(y_pred, eps, 1 - eps)
        loss = -np.mean(
            y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred)
        )
        return loss

    def backward(self, cache, y_true):
        """
        Backpropagation to compute gradients w.r.t. parameters.

        Returns a dict of gradients: dW1, db1, dW2, db2
        """
        X = cache["X"]
        z1 = cache["z1"]
        a1 = cache["a1"]
        y_hat = cache["y_hat"]

        N = X.shape[0]

        # dL/dz2 for sigmoid + BCE:
        #   y_hat = sigmoid(z2)
        #   dL/dz2 = (y_hat - y_true) / N
        dz2 = (y_hat - y_true) / N      # shape: (N, 1)

        # Gradients for second layer
        dW2 = a1.T @ dz2                # shape: (hidden_dim, 1)
        db2 = np.sum(dz2, axis=0, keepdims=True)

        # Backprop into first layer
        da1 = dz2 @ self.W2.T           # shape: (N, hidden_dim)
        dz1 = da1 * self._relu_grad(z1)
        dW1 = X.T @ dz1                 # shape: (input_dim, hidden_dim)
        db1 = np.sum(dz1, axis=0, keepdims=True)

        grads = {
            "dW1": dW1,
            "db1": db1,
            "dW2": dW2,
            "db2": db2
        }
        return grads

    def update_params(self, grads, lr: float):
        """
        Gradient descent parameter update.
        """
        self.W1 -= lr * grads["dW1"]
        self.b1 -= lr * grads["db1"]
        self.W2 -= lr * grads["dW2"]
        self.b2 -= lr * grads["db2"]

    def predict(self, X, threshold: float = 0.5):
        """
        Predict class labels (0 or 1) for X.
        """
        y_hat, _ = self.forward(X)
        return (y_hat >= threshold).astype(int)


def train_demo():
    # 1) Create toy dataset
    X, y = make_toy_data(n_per_class=200, seed=42)
    input_dim = X.shape[1]  # 2

    # 2) Create neural network
    nn = SimpleNeuralNet(input_dim=input_dim, hidden_dim=8, seed=42)

    # 3) Training loop
    epochs = 2000
    lr = 0.1

    for epoch in range(1, epochs + 1):
        # Forward pass
        y_hat, cache = nn.forward(X)

        # Compute loss
        loss = nn.binary_cross_entropy(y, y_hat)

        # Backward pass
        grads = nn.backward(cache, y)

        # Update parameters
        nn.update_params(grads, lr)

        if epoch % 200 == 0 or epoch == 1:
            print(f"Epoch {epoch:4d}/{epochs}, loss = {loss:.4f}")

    # 4) Evaluate accuracy on the training data
    y_pred = nn.predict(X)
    accuracy = np.mean(y_pred == y)
    print(f"\nTraining accuracy: {accuracy * 100:.2f}% on {len(X)} samples")


if __name__ == "__main__":
    train_demo()

